import { PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three';
import { config } from './config';
import { Pointer } from './core/pointer';
import { VirtualScroll } from './core/virtual-scroll';
import { Fluid } from './effects/fluid';
import { Relief } from './relief/relief';

const params = new URLSearchParams(location.search);
const canvas = document.querySelector<HTMLCanvasElement>('#webgl')!;
const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const { fov, distance, near, far } = config.camera;
const camera = new PerspectiveCamera(fov, 1, near, far);
camera.position.z = distance;

const pointer = new Pointer();
const fluid = new Fluid(config.fluid);
const scroll = new VirtualScroll(config.scroll);

const relief = await Relief.create({ renderer, pointer, fluid: fluid.uniform, config });
const scene = new Scene().add(relief.object);

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  const dpr = renderer.getPixelRatio();
  relief.resize(camera, width * dpr, height * dpr);
}
window.addEventListener('resize', resize);
resize();

if (params.has('debug')) {
  import('./debug').then(({ createDebugPanel }) => createDebugPanel(relief, config));
}

const timer = new Timer();
timer.connect(document);
renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const deltaMs = Math.min(timer.getDelta() * 1000, 100);
  pointer.tick(deltaMs);
  scroll.update(deltaMs);
  fluid.update(renderer, deltaMs);
  relief.update(deltaMs, scroll.current);
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
});
