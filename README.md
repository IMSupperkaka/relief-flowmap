# relief-flowmap

复刻 immersive-g.com 首页的石膏浮雕、鼠标交互与循环滚动，用 three.js 实现。没有页面切换、快速滚动模式、项目卡片等其他模块。

```bash
npm install
npm run fetch:original   # 下载原站浮雕资源到 public/vendor（仅本地，不入库）
npm run dev              # http://localhost:5173
```

- 浮雕资源路径在 `src/config.ts` 的 `assets` 中配置。换成自家设计的资源时只改这里，交付规格见 [docs/relief-asset-spec.md](docs/relief-asset-spec.md)。
- 滚轮或触摸拖动可以滚动墙面，浮雕按行无限循环。
- 加 `?debug` 打开调参面板（lil-gui）。

> 原站资源（`reliefs_high_compressed.glb`、`plaster.jpg`、`mask-noise.png`）归 Immersive Garden 所有，只用于本地学习。`public/vendor` 已加入 gitignore，不要提交、部署或再分发。`npm run build` 会把它复制进 `dist`，所以构建产物也不能发布。

## 每帧流程

```
wheel/touch ───> VirtualScroll ─> surface.setScroll + flowmap 偏移
pointermove ─┬─> Pointer（归一化坐标 + 速度）─> Flowmap（256² ping-pong）─┐
             │                                AutoStroke(mouse2) ──────┤
             └─> Fluid（稳定流体，70Hz）──── dye 贴图 ────────────────────┤
                                                                       v
                         Relief 网格：顶点按挤出量沿 z 抬高；片元在 6 级烘焙光照之间插值
```

| 文件 | 作用 |
| --- | --- |
| `src/core/virtual-scroll.ts` | 无上下界的虚拟滚动：滚轮/触摸输入 + 与帧率无关的阻尼 |
| `src/effects/flowmap.ts` | 鼠标轨迹贴图：rg 是速度，b 是鼠标印章强度，a 是自动笔触强度；按帧时间归一化衰减 |
| `src/effects/auto-stroke.ts` | 空闲时的"幽灵笔触"（gsap RoughEase），驱动 mouse2 |
| `src/effects/fluid.ts` | 稳定流体，输出 dye 贴图供彩虹边缘使用 |
| `src/relief/relief-model.ts` | 加载浮雕 GLB：每个顶层 mesh 是一块分块，网格自带浮雕形状，`map`/`emissiveMap` 即 6 级烘焙光照；滚动时按行循环 |
| `src/relief/wall.ts` | 全屏背景墙，补齐分块没覆盖到的地方 |
| `src/relief/relief-material.ts` | 浮雕材质与所有分块共享的 uniform |
| `src/relief/relief.ts` | 组装背景墙、浮雕模型、flowmap 与自动笔触，处理相机适配和滚动 |
| `src/relief/shaders/relief.*` | 运行时着色：顶点挤出、6 级插值、石膏纹理、屏幕空间法线、流体彩虹 |

## 换成自己的美术资源

交付规格见 [docs/relief-asset-spec.md](docs/relief-asset-spec.md)。
