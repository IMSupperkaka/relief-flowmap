import { Mesh, ShaderMaterial } from 'three';
import { FULLSCREEN_VERTEX, fullscreenTriangle } from '../core/fullscreen-pass';
import type { ReliefUniforms } from './relief-material';
import fragmentShader from './shaders/wall.frag?raw';

/** 全屏背景墙，最先绘制，不参与深度测试。 */
export function createWall(shared: ReliefUniforms): Mesh<typeof fullscreenTriangle, ShaderMaterial> {
  const material = new ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader,
    uniforms: {
      tPlaster: shared.tPlaster,
      uTextureStrength: shared.uTextureStrength,
      uGradientStrength: shared.uGradientStrength,
    },
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(fullscreenTriangle, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}
