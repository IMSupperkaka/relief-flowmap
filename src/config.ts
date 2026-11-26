// 数值取自原站 bundle 中 relief / fluidFlowmap 的配置（桌面端）。
export const config = {
  camera: { fov: 30, distance: 15, near: 5, far: 20 },
  // 浮雕资源路径（相对 public/）。换成设计交付的文件时只改这里，规格见 docs/relief-asset-spec.md
  assets: {
    model: 'vendor/immersive-g/reliefs_high_compressed.glb',
    plaster: 'vendor/immersive-g/plaster.jpg',
    maskNoise: 'vendor/immersive-g/mask-noise.png',
    dracoDecoder: 'vendor/draco/',
  },
  // 浮雕分块的排布：行距（世界单位），以及窄屏时要完整露出一列所需的宽度系数
  layout: { rowHeight: 9.995, columnWidthFactor: 1.33 },
  flowmap: { size: 256, mouseEase: 0.4, dissipation: 0.953, falloff: 0.38, alpha: 1 },
  extrude: { textureStrength: 1, gradientStrength: 0.17, brightnessFactor: 0.6, brightnessOffset: 0.4 },
  chromaticMask: { fresnelSharpness: 35, fresnelOpacity: 0.98, shadowRange: { min: 0.2, max: 0.42 }, shadowOpacity: 0.25 },
  fluidEffect: {
    amplitude: 0.57,
    fluidMagnitude: 0.15,
    linesSpeed: 2,
    linesScale: 4,
    linesStrength: 0,
    linesWaveLength: 0.15,
    hueShift: -0.52,
    colorRange: 2,
  },
  fluid: {
    densityDissipation: 0.95,
    velocityDissipation: 0.8891,
    pressureDissipation: 0.925,
    velocityRange: { min: 5, max: 78 },
    curlStrength: 0.1,
    radius: 0.7,
  },
  autoStroke: { enabled: true },
  scroll: {
    speed: 0.25, // 滚动一屏（设备像素高度）对应移动 speed 行浮雕
    lerp: 0.05,
    wheelMultiplier: 1,
    touchMultiplier: 1,
    // 原站换算 flowmap 偏移时乘了 fastModeZoom(0.6)，鼠标轨迹会比墙面移动得慢一些
    flowmapFollow: 0.6,
  },
};

export type Config = typeof config;
