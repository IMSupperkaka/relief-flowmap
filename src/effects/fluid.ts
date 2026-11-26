import {
  HalfFloatType,
  LinearFilter,
  NearestFilter,
  RGBAFormat,
  RGFormat,
  RedFormat,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type PixelFormat,
  type RenderTargetOptions,
  type MagnificationTextureFilter,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { Config } from '../config';
import { DoubleTarget, FullscreenPass } from '../core/fullscreen-pass';
import advectFrag from './shaders/fluid/advect.frag?raw';
import baseVert from './shaders/fluid/base.vert?raw';
import clearFrag from './shaders/fluid/clear.frag?raw';
import curlFrag from './shaders/fluid/curl.frag?raw';
import divergenceFrag from './shaders/fluid/divergence.frag?raw';
import gradientFrag from './shaders/fluid/gradient-subtract.frag?raw';
import pressureFrag from './shaders/fluid/pressure.frag?raw';
import splatFrag from './shaders/fluid/splat.frag?raw';
import vorticityFrag from './shaders/fluid/vorticity.frag?raw';

const SIM_SIZE = 128;
const DYE_SIZE = 512;
const PRESSURE_ITERATIONS = 3;
const STEP_MS = 1000 / 70; // 原站固定 70Hz 步进
const MAX_POINTER_DELTA = 20;

interface ISplat {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

type FluidConfig = Config['fluid'];

/**
 * 稳定流体（Stam / Pavel Dobryakov 方案）。
 * 输出的 dye 贴图：rg = 累积的鼠标速度，b = 密度，供浮雕的彩虹边缘使用。
 */
export class Fluid {
  readonly uniform: { value: Texture };

  private readonly _velocity: DoubleTarget;
  private readonly _dye: DoubleTarget;
  private readonly _pressure: DoubleTarget;
  private readonly _divergence: WebGLRenderTarget;
  private readonly _curl: WebGLRenderTarget;

  private readonly _texelSize = { value: new Vector2(1 / SIM_SIZE, 1 / SIM_SIZE) };
  private readonly _splatPass = this._createPass(splatFrag, {
    uTarget: { value: null },
    aspectRatio: { value: 1 },
    color: { value: new Vector3() },
    point: { value: new Vector2() },
    radius: { value: 1 },
  });
  private readonly _clearPass = this._createPass(clearFrag, { uTexture: { value: null }, value: { value: 1 } });
  private readonly _advectPass = this._createPass(advectFrag, {
    uVelocity: { value: null },
    uSource: { value: null },
    dt: { value: 0.016 },
    dissipation: { value: 1 },
  });
  private readonly _divergencePass = this._createPass(divergenceFrag, { uVelocity: { value: null } });
  private readonly _curlPass = this._createPass(curlFrag, { uVelocity: { value: null } });
  private readonly _vorticityPass = this._createPass(vorticityFrag, {
    uVelocity: { value: null },
    uCurl: { value: null },
    curl: { value: 0 },
    dt: { value: 0.016 },
  });
  private readonly _pressurePass = this._createPass(pressureFrag, { uPressure: { value: null }, uDivergence: { value: null } });
  private readonly _gradientPass = this._createPass(gradientFrag, { uPressure: { value: null }, uVelocity: { value: null } });

  private readonly _queue: ISplat[] = [];
  private readonly _lastPointer = new Vector2();
  private _hasPointer = false;
  private _accumulator = 0;

  constructor(private readonly _config: FluidConfig) {
    this._velocity = new DoubleTarget(SIM_SIZE, SIM_SIZE, targetOptions(RGFormat, LinearFilter));
    this._dye = new DoubleTarget(DYE_SIZE, DYE_SIZE, targetOptions(RGBAFormat, LinearFilter));
    this._pressure = new DoubleTarget(SIM_SIZE, SIM_SIZE, targetOptions(RedFormat, NearestFilter));
    this._divergence = new WebGLRenderTarget(SIM_SIZE, SIM_SIZE, targetOptions(RedFormat, NearestFilter));
    this._curl = new WebGLRenderTarget(SIM_SIZE, SIM_SIZE, targetOptions(RedFormat, NearestFilter));
    this.uniform = { value: this._dye.read.texture };
    window.addEventListener('pointermove', this._onPointerMove);
  }

  update(renderer: WebGLRenderer, deltaMs: number): void {
    this._accumulator += deltaMs;
    if (this._accumulator < STEP_MS) return;
    this._accumulator = Math.min(this._accumulator - STEP_MS, STEP_MS);
    this._step(renderer);
  }

  dispose(): void {
    window.removeEventListener('pointermove', this._onPointerMove);
    [this._velocity, this._dye, this._pressure].forEach((t) => t.dispose());
    this._divergence.dispose();
    this._curl.dispose();
    [
      this._splatPass,
      this._clearPass,
      this._advectPass,
      this._divergencePass,
      this._curlPass,
      this._vorticityPass,
      this._pressurePass,
      this._gradientPass,
    ].forEach((p) => p.dispose());
  }

  private _step(renderer: WebGLRenderer): void {
    const previousTarget = renderer.getRenderTarget();
    const cfg = this._config;

    while (this._queue.length) this._splat(renderer, this._queue.shift()!);

    let u = this._curlPass.material.uniforms;
    u.uVelocity.value = this._velocity.read.texture;
    this._curlPass.render(renderer, this._curl);

    u = this._vorticityPass.material.uniforms;
    u.uVelocity.value = this._velocity.read.texture;
    u.uCurl.value = this._curl.texture;
    u.curl.value = cfg.curlStrength;
    this._vorticityPass.render(renderer, this._velocity.write);
    this._velocity.swap();

    u = this._divergencePass.material.uniforms;
    u.uVelocity.value = this._velocity.read.texture;
    this._divergencePass.render(renderer, this._divergence);

    u = this._clearPass.material.uniforms;
    u.uTexture.value = this._pressure.read.texture;
    u.value.value = cfg.pressureDissipation;
    this._clearPass.render(renderer, this._pressure.write);
    this._pressure.swap();

    u = this._pressurePass.material.uniforms;
    u.uDivergence.value = this._divergence.texture;
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      u.uPressure.value = this._pressure.read.texture;
      this._pressurePass.render(renderer, this._pressure.write);
      this._pressure.swap();
    }

    u = this._gradientPass.material.uniforms;
    u.uPressure.value = this._pressure.read.texture;
    u.uVelocity.value = this._velocity.read.texture;
    this._gradientPass.render(renderer, this._velocity.write);
    this._velocity.swap();

    u = this._advectPass.material.uniforms;
    u.uVelocity.value = this._velocity.read.texture;
    u.uSource.value = this._velocity.read.texture;
    u.dissipation.value = cfg.velocityDissipation;
    this._advectPass.render(renderer, this._velocity.write);
    this._velocity.swap();

    u.uVelocity.value = this._velocity.read.texture;
    u.uSource.value = this._dye.read.texture;
    u.dissipation.value = cfg.densityDissipation;
    this._advectPass.render(renderer, this._dye.write);
    this._dye.swap();

    this.uniform.value = this._dye.read.texture;
    renderer.setRenderTarget(previousTarget);
  }

  private _splat(renderer: WebGLRenderer, { x, y, dx, dy }: ISplat): void {
    const { velocityRange, radius } = this._config;
    const u = this._splatPass.material.uniforms;
    const speed = Math.hypot(dx, dy);
    const strength = Math.min(2, Math.max(0, ((speed - velocityRange.min) / (velocityRange.max - velocityRange.min)) * 2));
    u.aspectRatio.value = window.innerWidth / window.innerHeight;
    u.point.value.set(x, y);
    u.color.value.set(dx, dy, 1);
    u.radius.value = (radius / 100) * strength;

    u.uTarget.value = this._velocity.read.texture;
    this._splatPass.render(renderer, this._velocity.write);
    this._velocity.swap();

    u.uTarget.value = this._dye.read.texture;
    this._splatPass.render(renderer, this._dye.write);
    this._dye.swap();
  }

  private _createPass(fragmentShader: string, uniforms: Record<string, { value: unknown }>): FullscreenPass {
    return new FullscreenPass(
      new ShaderMaterial({
        vertexShader: baseVert,
        fragmentShader,
        uniforms: { texelSize: this._texelSize, ...uniforms },
        depthTest: false,
        depthWrite: false,
      }),
    );
  }

  private readonly _onPointerMove = (e: PointerEvent): void => {
    const events = e.getCoalescedEvents?.() ?? [];
    for (const ev of events.length > 1 ? events : [e]) this._queuePointer(ev.clientX, ev.clientY);
  };

  private _queuePointer(px: number, py: number): void {
    if (!this._hasPointer) {
      this._hasPointer = true;
      this._lastPointer.set(px, py);
    }
    let dx = px - this._lastPointer.x;
    let dy = py - this._lastPointer.y;
    // 单次位移超过 20px 时按比例压回，防止快速甩动炸出过大的速度
    if (dx) dx /= Math.max(1, Math.abs(dx) / MAX_POINTER_DELTA);
    if (dy) dy /= Math.max(1, Math.abs(dy) / MAX_POINTER_DELTA);
    this._lastPointer.set(px, py);
    if (!dx && !dy) return;
    this._queue.push({ x: px / window.innerWidth, y: 1 - py / window.innerHeight, dx: dx * 5, dy: dy * -5 });
  }
}

function targetOptions(format: PixelFormat, filter: MagnificationTextureFilter): RenderTargetOptions {
  return { type: HalfFloatType, format, minFilter: filter, magFilter: filter, depthBuffer: false };
}
