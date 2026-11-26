import {
  Group,
  MathUtils,
  RepeatWrapping,
  TextureLoader,
  type IUniform,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import type { Config } from '../config';
import type { Pointer } from '../core/pointer';
import { AutoStroke } from '../effects/auto-stroke';
import { Flowmap } from '../effects/flowmap';
import { createSharedUniforms, type ReliefUniforms } from './relief-material';
import { ReliefModel } from './relief-model';
import { createWall } from './wall';

// 单帧 flowmap 偏移上限，防止跳跃式滚动把轨迹整个甩出去
const MAX_FLOW_OFFSET = 0.2;

interface IReliefDeps {
  renderer: WebGLRenderer;
  pointer: Pointer;
  fluid: IUniform<Texture>;
  config: Config;
}

/** 首页石膏浮雕：背景墙 + 可循环滚动的浮雕分块，鼠标轨迹驱动挤出。 */
export class Relief {
  readonly object = new Group();
  readonly uniforms: ReliefUniforms;
  readonly flowmap: Flowmap;
  readonly autoStroke: AutoStroke;

  private _time = 0;
  private _viewHeight = 1;
  private _pixelHeight = 1;
  private _lastScreenScroll = 0;

  private constructor(
    private readonly _renderer: WebGLRenderer,
    private readonly _pointer: Pointer,
    private readonly _config: Config,
    private readonly _model: ReliefModel,
    private readonly _textures: Texture[],
    flowmap: Flowmap,
    uniforms: ReliefUniforms,
  ) {
    this.flowmap = flowmap;
    this.uniforms = uniforms;
    this.autoStroke = new AutoStroke(flowmap);
    this.object.add(createWall(uniforms), _model.object);
    if (_config.autoStroke.enabled) this.autoStroke.start();
  }

  static async create({ renderer, pointer, fluid, config }: IReliefDeps): Promise<Relief> {
    const base = import.meta.env.BASE_URL;
    const { assets, layout } = config;
    const flowmap = new Flowmap(config.flowmap);
    const uniforms = createSharedUniforms(config, { flow: flowmap.uniform, fluid });

    const textureLoader = new TextureLoader();
    const [model, plaster, maskNoise] = await Promise.all([
      ReliefModel.load(base + assets.model, base + assets.dracoDecoder, layout.rowHeight, uniforms),
      textureLoader.loadAsync(base + assets.plaster),
      textureLoader.loadAsync(base + assets.maskNoise),
    ]);
    for (const t of [plaster, maskNoise]) t.wrapS = t.wrapT = RepeatWrapping;
    uniforms.tPlaster.value = plaster;
    flowmap.setNoise(maskNoise);

    return new Relief(renderer, pointer, config, model, [plaster, maskNoise], flowmap, uniforms);
  }

  resize(camera: PerspectiveCamera, pixelWidth: number, pixelHeight: number): void {
    const { camera: cameraConfig, layout } = this._config;
    // 窄屏时缩小 fov，保证中间一列浮雕完整露出
    const heightForColumn = (layout.columnWidthFactor * (layout.rowHeight - 0.1)) / camera.aspect;
    camera.fov = Math.min(cameraConfig.fov, MathUtils.radToDeg(2 * Math.atan(heightForColumn / (2 * cameraConfig.distance))));
    camera.updateProjectionMatrix();

    this.uniforms.uResolution.value.set(pixelWidth, pixelHeight);
    this.flowmap.aspect = camera.aspect;
    this._viewHeight = 2 * cameraConfig.distance * Math.tan(MathUtils.degToRad(camera.fov / 2));
    this._pixelHeight = pixelHeight;
  }

  /** scrollPx：平滑后的虚拟滚动位置（CSS 像素） */
  update(deltaMs: number, scrollPx: number): void {
    this._time += deltaMs / 1000;
    const { flowmap, _pointer: pointer, _config: config } = this;

    // 滚动距离除以设备像素高度（与原站公式一致），1 个单位 = 一行浮雕；向下滚动时墙面上移（已在原站实测确认）
    const offsetY = (scrollPx / this._pixelHeight) * config.scroll.speed * config.layout.rowHeight;
    this._model.setScroll(offsetY);
    const screenScroll = (offsetY * config.scroll.flowmapFollow) / this._viewHeight;
    const flowOffset = MathUtils.clamp(screenScroll - this._lastScreenScroll, -MAX_FLOW_OFFSET, MAX_FLOW_OFFSET);
    this._lastScreenScroll = screenScroll;

    flowmap.mouse.lerp(pointer.normalFlip, config.flowmap.mouseEase);
    flowmap.velocity.lerp(pointer.velocity, pointer.velocity.lengthSq() > 0 ? 0.1 : 0.04);
    flowmap.update(this._renderer, deltaMs, this._time, -flowOffset);
    this.uniforms.uTime.value = this._time;
  }

  dispose(): void {
    this.autoStroke.stop();
    this.flowmap.dispose();
    this._model.dispose();
    this._textures.forEach((t) => t.dispose());
  }
}
