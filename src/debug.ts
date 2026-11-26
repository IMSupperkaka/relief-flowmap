import GUI from 'lil-gui';
import type { Config } from './config';
import type { Relief } from './relief/relief';

/** 加 ?debug 打开，分组与原站 Tweakpane 面板保持一致。 */
export function createDebugPanel(relief: Relief, config: Config): GUI {
  const gui = new GUI({ title: 'Home Relief' });
  const u = relief.uniforms;
  const bind = (key: string) => (v: number) => {
    u[key].value = v;
  };

  const reliefFolder = gui.addFolder('Relief');
  reliefFolder
    .add(config.autoStroke, 'enabled')
    .name('auto stroke')
    .onChange((on: boolean) => (on ? relief.autoStroke.start() : relief.autoStroke.stop()));

  const scroll = gui.addFolder('Scroll');
  scroll.add(config.scroll, 'speed', 0.01, 2, 0.01);
  scroll.add(config.scroll, 'flowmapFollow', 0, 2, 0.01);

  const flow = gui.addFolder('Flowmap');
  flow.add(config.flowmap, 'mouseEase', 0.001, 0.4, 0.001);
  flow.add(config.flowmap, 'dissipation', 0.95, 0.995, 0.001).onChange((v: number) => relief.flowmap.setDissipation(v));
  flow.add(config.flowmap, 'falloff', 0.01, 1, 0.01).onChange((v: number) => relief.flowmap.setFalloff(v));
  flow.add(config.flowmap, 'alpha', 0, 1, 0.01).onChange((v: number) => relief.flowmap.setAlpha(v));

  const extrude = gui.addFolder('Extrude');
  extrude.add(config.extrude, 'textureStrength', 0, 1, 0.01).onChange(bind('uTextureStrength'));
  extrude.add(config.extrude, 'gradientStrength', 0, 1, 0.01).onChange(bind('uGradientStrength'));

  const chroma = gui.addFolder('Chromatic Mask');
  chroma.add(config.chromaticMask, 'fresnelSharpness', 1, 60, 0.01).onChange(bind('uFresnelSharpness'));
  chroma.add(config.chromaticMask, 'fresnelOpacity', 0, 3, 0.01).onChange(bind('uFresnelOpacity'));
  chroma.add(config.chromaticMask.shadowRange, 'min', 0, 1, 0.01).name('shadowRange min').onChange((v: number) => (u.uShadowRange.value.x = v));
  chroma.add(config.chromaticMask.shadowRange, 'max', 0, 1, 0.01).name('shadowRange max').onChange((v: number) => (u.uShadowRange.value.y = v));
  chroma.add(config.chromaticMask, 'shadowOpacity', 0, 3, 0.01).onChange(bind('uShadowOpacity'));

  const fx = gui.addFolder('Fluid Effect');
  fx.add(config.fluidEffect, 'amplitude', 0, 2, 0.01).onChange(bind('uEffectAmplitude'));
  fx.add(config.fluidEffect, 'fluidMagnitude', 0, 2, 0.01).onChange(bind('uEffectFluidMagnitude'));
  fx.add(config.fluidEffect, 'linesSpeed', 0, 2, 0.01).onChange(bind('uEffectLinesSpeed'));
  fx.add(config.fluidEffect, 'linesScale', 0.4, 4, 0.01).onChange(bind('uEffectLinesScale'));
  fx.add(config.fluidEffect, 'linesStrength', 0, 2, 0.01).onChange(bind('uEffectLinesStrength'));
  fx.add(config.fluidEffect, 'linesWaveLength', 0, 2, 0.01).onChange(bind('uEffectLinesWaveLength'));
  fx.add(config.fluidEffect, 'hueShift', -1, 1, 0.01).onChange(bind('uEffectHueShift'));
  fx.add(config.fluidEffect, 'colorRange', 0, 5, 0.01).onChange(bind('uEffectColorRange'));

  gui.close();
  return gui;
}
