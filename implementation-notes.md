# Implementation Notes

## 与原站一致的部分

flowmap、稳定流体、浮雕片元/顶点 shader 的数学与参数，都直接取自原站 bundle（`entry.DyxL_KXi.js`）的桌面端配置：

- flowmap：dissipation .953、falloff .38、mouseEase .4
- 流体：density .95、velocity .8891、pressure .925、curl .1、radius .7
- 彩虹：amplitude .57、hueShift -.52
- chromaticMask：fresnel 35 / .98、shadowRange .2–.42

## Deviations

- **美术资源**：原站资源通过 `npm run fetch:original` 下载到 `public/vendor`（gitignore），只在本地使用；路径在 `config.assets` 中配置，之后换成自家设计的资源。早期的程序化构图已删除。
- **背景墙**：原站的分块并不都铺满（有的只覆盖半边），背后有一张全屏背景墙（`T_e` shader），这里同样移植了。它的石膏纹理按屏幕 uv 平铺、不随滚动移动，与原站一致。
- **原站构图的摆放**：6 行分块随滚动在 [-30, 30] 内循环；相机 fov 按 `1.33 × (9.995 − 0.1) / aspect` 收窄。
- **滚动**：
  - 偏移量 = 滚动像素 ÷ 设备像素高度 × 0.25 × 9.995，与原站公式一致（在 dpr 2 的屏幕上，滚动距离只有 dpr 1 时的一半，原站也一样）。
  - 方向：bundle 里写的是 `scene.y = uScroll × −9.995`，看起来是向下滚墙面下移；但在原站实测（1440×900、dpr 1，滚轮 250px），石膏纹理上移 78px，与公式算出的 76px 相符。最终按实测，取向下滚墙面上移。
  - 原站用 Lenis（lerp 0.05）驱动页面 DOM 滚动；这里页面没有可滚动的 DOM，所以改用自己写的虚拟滚动，保留同样的阻尼系数，与帧率无关。
  - flowmap 偏移沿用原站的 `fastModeZoom(0.6)` 系数（`config.scroll.flowmapFollow`），所以鼠标轨迹会比墙面移动得略慢；单帧偏移上限 0.2。
  - 原站顶点里的 `uScrollSpeed` / `deformY` 算出来没有被使用，所以没有移植。
- **vEye**：用完整浮雕形状（未压扁）求屏幕空间法线，与原站一致。
- **删掉的功能**：快速滚动模式（uFastScroll 噪声挤出、相机缩放）、黑色主题切换 `uSwitchColorTransition`、显示/隐藏动画、移动端的亮度参数。
- **烘焙贴图解码**：原站把 GLB 贴图当 sRGB 解码，采样后再做 `sRGBTransferOETF` 取回编码值。这里把 `colorSpace` 设为 `NoColorSpace`，直接采样原始值，省掉这一来一回；区别只在于插值发生在编码空间，肉眼看不出。
- **流体 splat 防护**：原 shader 在 radius 为 0 时会出现 0/0，这里加了判断。
- **splat 队列顺序**：原站从队尾逆序处理，这里按 FIFO 顺序处理，视觉上没有区别。
- **彩虹参数**：原站用 `#define` 注入，这里改成 uniform，便于调试面板实时调整。

## 未覆盖

- 只在 Chrome（Claude 预览浏览器，1440×900、1280×800、800×900）上验证过，Safari 和移动端没有测试。
