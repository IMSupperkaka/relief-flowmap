import { Group, Mesh, NoColorSpace, type MeshStandardMaterial, type ShaderMaterial } from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createReliefMaterial, type ReliefUniforms } from './relief-material';

type SectionMesh = Mesh<Mesh['geometry'], ShaderMaterial>;

/**
 * 浮雕模型：GLB 里每个顶层 mesh 是一块浮雕分块，自带浮雕形状；
 * 材质的 map / emissiveMap 是打包好的 6 级烘焙光照。滚动时分块按行无限循环。
 */
export class ReliefModel {
  readonly object = new Group();

  private constructor(
    private readonly _sections: SectionMesh[],
    private readonly _span: number,
  ) {
    this.object.add(...this._sections);
    this.setScroll(0);
  }

  static async load(url: string, dracoDecoderPath: string, rowHeight: number, shared: ReliefUniforms): Promise<ReliefModel> {
    const draco = new DRACOLoader().setDecoderPath(dracoDecoderPath);
    const gltf = await new GLTFLoader()
      .setDRACOLoader(draco)
      .loadAsync(url)
      .finally(() => draco.dispose());

    const rows: number[] = [];
    const sections = gltf.scene.children
      .filter((child): child is Mesh => (child as Mesh).isMesh)
      .map((source) => {
        const sourceMaterial = source.material as MeshStandardMaterial;
        const bake1 = sourceMaterial.map;
        const bake2 = sourceMaterial.emissiveMap;
        if (!bake1 || !bake2) throw new Error(`浮雕分块 "${source.name}" 缺少 baseColor 或 emissive 贴图`);
        // 原站采样后做 sRGBTransferOETF 取回编码值；这里直接按原始数据采样，效果相同
        for (const t of [bake1, bake2]) {
          t.colorSpace = NoColorSpace;
          t.needsUpdate = true;
        }
        sourceMaterial.dispose();

        const mesh = new Mesh(source.geometry, createReliefMaterial(shared, { bake1, bake2 }));
        mesh.position.copy(source.position);
        mesh.scale.copy(source.scale);
        const row = Math.round(source.position.y / rowHeight);
        if (!rows.includes(row)) rows.push(row);
        // 相邻行在边缘有重叠，按行号决定绘制顺序
        mesh.renderOrder = rows.indexOf(row);
        return mesh;
      });
    if (!sections.length) throw new Error(`${url} 中没有浮雕分块`);

    return new ReliefModel(sections, rows.length * rowHeight);
  }

  /** 整体平移后，把越出 [-span/2, span/2] 的分块搬到另一头，实现无限循环 */
  setScroll(offsetY: number): void {
    this.object.position.y = offsetY;
    const half = this._span / 2;
    for (const mesh of this._sections) {
      while (mesh.position.y + offsetY < -half) mesh.position.y += this._span;
      while (mesh.position.y + offsetY > half) mesh.position.y -= this._span;
    }
  }

  dispose(): void {
    for (const mesh of this._sections) {
      mesh.geometry.dispose();
      mesh.material.uniforms.tBake1.value.dispose();
      mesh.material.uniforms.tBake2.value.dispose();
      mesh.material.dispose();
    }
  }
}
