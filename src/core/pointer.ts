import { Vector2 } from 'three';

// 对应原站的全局鼠标类：归一化坐标（y 向上）+ 按帧时间缩放的速度。
export class Pointer {
  // 未进入页面前放在屏幕外，避免在 (0,0) 留下印章
  readonly normalFlip = new Vector2(-1, -1);
  readonly velocity = new Vector2();
  private readonly _last = new Vector2(-1, -1);

  constructor() {
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerdown', this._onMove);
  }

  tick(deltaMs: number): void {
    if (this._last.x === -1) this._last.copy(this.normalFlip);
    const dx = this.normalFlip.x - this._last.x;
    const dy = this.normalFlip.y - this._last.y;
    this._last.copy(this.normalFlip);
    const r = Math.min(32, deltaMs) / 16;
    this.velocity.set(dx * r, dy * r);
  }

  dispose(): void {
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerdown', this._onMove);
  }

  private readonly _onMove = (e: PointerEvent): void => {
    this.normalFlip.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  };
}
