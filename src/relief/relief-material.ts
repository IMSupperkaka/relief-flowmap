import { ShaderMaterial, Vector2, type IUniform, type Texture } from 'three';
import type { Config } from '../config';
import fluidEffect from './shaders/fluid-effect.glsl?raw';
import reliefFrag from './shaders/relief.frag?raw';
import reliefVert from './shaders/relief.vert?raw';

export type ReliefUniforms = Record<string, IUniform>;

/** 所有浮雕分块共用的 uniform（同一个对象被多个材质引用，改一处全部生效）。 */
export function createSharedUniforms(
  config: Config,
  textures: { flow: IUniform<Texture>; fluid: IUniform<Texture> },
): ReliefUniforms {
  const { extrude, chromaticMask: chroma, fluidEffect: fx } = config;
  return {
    uResolution: { value: new Vector2() },
    uTime: { value: 0 },
    tFlow: textures.flow,
    tFluid: textures.fluid,
    // 资源加载完成后填入
    tPlaster: { value: null },
    uTextureStrength: { value: extrude.textureStrength },
    uGradientStrength: { value: extrude.gradientStrength },
    uBrightnessFactor: { value: extrude.brightnessFactor },
    uBrightnessOffset: { value: extrude.brightnessOffset },
    uFresnelSharpness: { value: chroma.fresnelSharpness },
    uFresnelOpacity: { value: chroma.fresnelOpacity },
    uShadowRange: { value: new Vector2(chroma.shadowRange.min, chroma.shadowRange.max) },
    uShadowOpacity: { value: chroma.shadowOpacity },
    uEffectAmplitude: { value: fx.amplitude },
    uEffectFluidMagnitude: { value: fx.fluidMagnitude },
    uEffectLinesSpeed: { value: fx.linesSpeed },
    uEffectLinesScale: { value: fx.linesScale },
    uEffectLinesStrength: { value: fx.linesStrength },
    uEffectLinesWaveLength: { value: fx.linesWaveLength },
    uEffectHueShift: { value: fx.hueShift },
    uEffectColorRange: { value: fx.colorRange },
  };
}

/** 单个浮雕分块的材质。tBake1/tBake2 是该分块的 6 级烘焙光照。 */
export function createReliefMaterial(shared: ReliefUniforms, bake: { bake1: Texture; bake2: Texture }): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: reliefVert,
    fragmentShader: fluidEffect + reliefFrag,
    uniforms: {
      ...shared,
      tBake1: { value: bake.bake1 },
      tBake2: { value: bake.bake2 },
    },
  });
}
