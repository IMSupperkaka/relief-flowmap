// 把 immersive-g.com 首页浮雕资源下载到 public/vendor/（已 gitignore）。
// 这些资源归 Immersive Garden 所有，仅供本地学习，不要提交、部署或再分发。
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = join(root, 'public/vendor');
const ORIGIN = 'https://immersive-g.com';

const assets = [
  ['/webgl/home/reliefs_high_compressed.glb', 'immersive-g/reliefs_high_compressed.glb'],
  ['/webgl/home/plaster.jpg', 'immersive-g/plaster.jpg'],
  ['/webgl/global/noises/mask-noise.png', 'immersive-g/mask-noise.png'],
];

for (const [remote, local] of assets) {
  const res = await fetch(ORIGIN + remote);
  if (!res.ok) throw new Error(`${remote}: HTTP ${res.status}`);
  const file = join(vendor, local);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${local}`);
}

// GLB 网格是 Draco 压缩的，解码器从 three 自带的文件复制
const dracoSrc = join(root, 'node_modules/three/examples/jsm/libs/draco/gltf');
const dracoDst = join(vendor, 'draco');
await mkdir(dracoDst, { recursive: true });
for (const f of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
  await copyFile(join(dracoSrc, f), join(dracoDst, f));
}
console.log('✓ draco decoder');
