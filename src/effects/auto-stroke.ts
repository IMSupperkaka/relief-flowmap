import { gsap } from 'gsap';
import { RoughEase } from 'gsap/EasePack';
import { Vector2 } from 'three';
import type { Flowmap } from './flowmap';

gsap.registerPlugin(RoughEase);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * 空闲时的"幽灵笔触"：用抖动缓动驱动 flowmap.mouse2 划过屏幕，
 * 让没有鼠标操作时浮雕也会自己时隐时现。
 */
export class AutoStroke {
  private _timeline: gsap.core.Timeline | null = null;

  constructor(private readonly _flowmap: Flowmap) {}

  start(): void {
    this.stop();
    this._timeline = this._createStroke();
    this._timeline.call(() => this.start(), [], `+=${lerp(1, 3, Math.random()).toFixed(2)}`);
  }

  stop(): void {
    this._timeline?.kill();
    this._timeline = null;
    this._flowmap.mouse2.set(-1, -1);
  }

  private _createStroke(): gsap.core.Timeline {
    const { mouse2, velocity2 } = this._flowmap;
    velocity2.set(1, 1);
    const segments = Math.floor(Math.random() * 3) + 1;
    const tl = gsap.timeline();
    let from: Vector2 | null = null;
    for (let i = 0; i < segments; i++) {
      const shaky = i !== segments - 1 && Math.random() < 0.7;
      const duration = shaky ? lerp(0.8, 1, Math.random()) : lerp(0.7, 0.8, Math.random());
      const { start, end } = randomDirection(from);
      const ease = RoughEase.config({
        strength: shaky ? 3 : 2,
        points: Math.floor(duration * 12),
        template: shaky ? 'power2.out' : 'none',
        taper: 'none',
        randomize: true,
        clamp: true,
      });
      // 与原站一致：x、y 两段 tween 顺序执行，笔触先横后竖，再叠上随机抖动
      tl.fromTo(mouse2, { x: start.x / 2 + 0.5 }, { x: end.x / 2 + 0.5, duration, ease });
      tl.fromTo(mouse2, { y: start.y / 2 + 0.5 }, { y: end.y / 2 + 0.5, duration, ease });
      from = end;
    }
    tl.set(mouse2, { x: -1, y: -1 });
    return tl;
  }
}

function randomDirection(from: Vector2 | null): { start: Vector2; end: Vector2 } {
  const start = from ?? new Vector2((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
  const angle = start.angleTo(new Vector2()) + (Math.random() - 0.5) * 2 * Math.PI * 0.8;
  const radius = lerp(0.7, 0.9, Math.random());
  return { start, end: new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius) };
}
