const LINE_HEIGHT = 16;

interface IVirtualScrollOptions {
  /** 与 Lenis 的 lerp 同义：60fps 下每帧向目标靠近的比例 */
  lerp: number;
  wheelMultiplier: number;
  touchMultiplier: number;
}

/**
 * 无上下界的虚拟滚动（单位：CSS 像素）。页面本身没有可滚动的 DOM，
 * 所以不用 Lenis，只保留它的输入归一化与阻尼平滑。
 */
export class VirtualScroll {
  /** 平滑后的滚动位置 */
  current = 0;
  private _target = 0;
  private _touchY: number | null = null;

  constructor(private readonly _options: IVirtualScrollOptions) {
    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchmove', this._onTouchMove, { passive: true });
    window.addEventListener('touchend', this._onTouchEnd);
  }

  update(deltaMs: number): void {
    // 与帧率无关的阻尼：lambda = lerp × 60
    const t = 1 - Math.exp(-this._options.lerp * 60 * (deltaMs / 1000));
    this.current += (this._target - this.current) * t;
  }

  dispose(): void {
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
  }

  private readonly _onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? LINE_HEIGHT : e.deltaMode === 2 ? window.innerHeight : 1;
    this._target += e.deltaY * unit * this._options.wheelMultiplier;
  };

  private readonly _onTouchStart = (e: TouchEvent): void => {
    this._touchY = e.touches[0].clientY;
  };

  private readonly _onTouchMove = (e: TouchEvent): void => {
    if (this._touchY === null) return;
    const y = e.touches[0].clientY;
    // 手指上滑 = 向下滚动
    this._target += (this._touchY - y) * this._options.touchMultiplier;
    this._touchY = y;
  };

  private readonly _onTouchEnd = (): void => {
    this._touchY = null;
  };
}
