import type { MomentClock } from '../../core';

/** A clock tests can advance by hand. Callbacks fire in time order. */
export class FakeClock implements MomentClock {
  private t = 0;
  private nextId = 1;
  private timers: { id: number; at: number; cb: () => void }[] = [];

  now = (): number => this.t;

  after = (ms: number, cb: () => void): (() => void) => {
    const id = this.nextId++;
    this.timers.push({ id, at: this.t + ms, cb });
    return () => {
      this.timers = this.timers.filter((x) => x.id !== id);
    };
  };

  /** Move time forward, firing each due callback at its own time. */
  advance(ms: number, run: (fn: () => void) => void = (fn) => fn()): void {
    const target = this.t + ms;
    for (;;) {
      const due = this.timers.filter((x) => x.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.timers = this.timers.filter((x) => x.id !== due.id);
      this.t = Math.max(this.t, due.at);
      run(due.cb);
    }
    this.t = target;
  }

  /** Move time forward WITHOUT firing anything, like a backgrounded app. Fire later with advance(0). */
  jump(ms: number): void {
    this.t += ms;
  }

  get pending(): number {
    return this.timers.length;
  }
}
