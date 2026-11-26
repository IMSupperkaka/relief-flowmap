import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type RenderTargetOptions,
  type WebGLRenderer,
} from 'three';

// 覆盖整个裁剪空间的单个三角形，比两个三角形的 quad 少一条对角线接缝。
export const fullscreenTriangle = new BufferGeometry();
fullscreenTriangle.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
fullscreenTriangle.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));

export const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export class FullscreenPass {
  readonly material: ShaderMaterial;
  private readonly _scene = new Scene();
  private readonly _camera = new OrthographicCamera();

  constructor(material: ShaderMaterial) {
    this.material = material;
    const mesh = new Mesh(fullscreenTriangle, material);
    mesh.frustumCulled = false;
    this._scene.add(mesh);
  }

  render(renderer: WebGLRenderer, target: WebGLRenderTarget | null): void {
    renderer.setRenderTarget(target);
    renderer.render(this._scene, this._camera);
  }

  dispose(): void {
    this.material.dispose();
  }
}

// ping-pong：读上一帧、写下一帧，再交换。
export class DoubleTarget {
  read: WebGLRenderTarget;
  write: WebGLRenderTarget;

  constructor(width: number, height: number, options: RenderTargetOptions) {
    this.read = new WebGLRenderTarget(width, height, options);
    this.write = new WebGLRenderTarget(width, height, options);
  }

  swap(): void {
    const t = this.read;
    this.read = this.write;
    this.write = t;
  }

  dispose(): void {
    this.read.dispose();
    this.write.dispose();
  }
}
