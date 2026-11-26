import { HalfFloatType, LinearFilter, RGBAFormat, ShaderMaterial, Vector2, type Texture, type WebGLRenderer } from 'three';
import { DoubleTarget, FULLSCREEN_VERTEX, FullscreenPass } from '../core/fullscreen-pass';
import fragmentShader from './shaders/flowmap.frag?raw';

interface IFlowmapOptions {
  size: number;
  falloff: number;
  alpha: number;
  dissipation: number;
}

/**
 * 鼠标轨迹贴图。rg = 速度方向，b = 鼠标印章强度，a = 自动笔触强度。
 * 每帧衰减一次，再在 mouse / mouse2 处各盖一个印章。
 */
export class Flowmap {
  readonly mouse = new Vector2(-1, -1);
  readonly velocity = new Vector2();
  readonly mouse2 = new Vector2(-1, -1);
  readonly velocity2 = new Vector2();
  readonly uniform: { value: Texture };
  aspect = 1;

  private readonly _targets: DoubleTarget;
  private readonly _pass: FullscreenPass;

  constructor(options: IFlowmapOptions) {
    this._targets = new DoubleTarget(options.size, options.size, {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
    });
    this.uniform = { value: this._targets.read.texture };
    this._pass = new FullscreenPass(
      new ShaderMaterial({
        vertexShader: FULLSCREEN_VERTEX,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tMap: this.uniform,
          tNoise: { value: null },
          uFalloff: { value: options.falloff * 0.5 },
          uAlpha: { value: options.alpha },
          uDissipation: { value: options.dissipation },
          uDeltaMult: { value: 1 },
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uOffset: { value: 0 },
          uMouse: { value: this.mouse },
          uVelocity: { value: this.velocity },
          uMouse2: { value: this.mouse2 },
          uVelocity2: { value: this.velocity2 },
        },
      }),
    );
  }

  /** 调制印章强度的噪声贴图（读取 g 通道） */
  setNoise(texture: Texture): void {
    this._pass.material.uniforms.tNoise.value = texture;
  }

  setFalloff(v: number): void {
    this._pass.material.uniforms.uFalloff.value = v * 0.5;
  }

  setDissipation(v: number): void {
    this._pass.material.uniforms.uDissipation.value = v;
  }

  setAlpha(v: number): void {
    this._pass.material.uniforms.uAlpha.value = v;
  }

  /** offset：本帧墙面在屏幕 uv 空间的纵向位移（取反后传入） */
  update(renderer: WebGLRenderer, deltaMs: number, time: number, offset = 0): void {
    const u = this._pass.material.uniforms;
    // 以 60fps 为基准归一化，保证不同刷新率下衰减速度一致
    u.uDeltaMult.value = Math.min(deltaMs, 32) / 16;
    u.uAspect.value = this.aspect;
    u.uTime.value = time;
    u.uOffset.value = offset;
    this._pass.render(renderer, this._targets.write);
    this._targets.swap();
    this.uniform.value = this._targets.read.texture;
  }

  dispose(): void {
    this._targets.dispose();
    this._pass.dispose();
  }
}
