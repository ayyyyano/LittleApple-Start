import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync("public/sakura.js", "utf8");

function animation() {
  let nextId = 0;
  let canvas: object | null = null;
  const callbacks = new Map<number, (time: number) => void>();
  const listeners = new Map<string, () => void>();
  const positions: number[][] = [];
  const rotations: number[] = [];
  const context = {
    save() {}, restore() {}, drawImage() {},
    rotate(angle: number) { rotations.push(angle); },
    clearRect() { positions.length = 0; rotations.length = 0; },
    translate(x: number, y: number) { positions.push([x, y]); },
  };
  const parent = {
    appendChild(element: object) { canvas = element; },
    removeChild() { canvas = null; },
  };
  const document = {
    hidden: false,
    getElementById: () => canvas,
    querySelector: () => parent,
    createElement: () => ({ setAttribute() {}, getContext: () => context, parentNode: parent }),
    addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
  };
  const window = {
    innerWidth: 2000, innerHeight: 2000,
    requestAnimationFrame(callback: (time: number) => void) {
      callbacks.set(++nextId, callback);
      return nextId;
    },
    cancelAnimationFrame: (id: number) => callbacks.delete(id),
    addEventListener() {},
    startSakura() {}, stopSakura() {},
  };
  runInNewContext(source, { window, document, Image: class {}, Math: Object.assign(Object.create(Math), { random: () => 0.5 }) });
  return {
    window, document, callbacks, rotations,
    frame(time: number) {
      const [id, callback] = [...callbacks][0];
      callbacks.delete(id);
      callback(time);
      return positions[0];
    },
    visibility(hidden: boolean) {
      document.hidden = hidden;
      listeners.get("visibilitychange")?.();
    },
  };
}

describe("Sakura wall-clock animation", () => {
  it("keeps the original 60 Hz speed across 1/15/30/60/120 Hz rendering", () => {
    for (const fps of [1, 15, 30, 60, 120]) {
      const app = animation();
      app.window.startSakura();
      app.frame(0);
      let position: number[] = [];
      for (let i = 1; i <= fps; i++) position = app.frame(i * 1000 / fps);
      expect(position[0]).toBeCloseTo(1000 - 1.7 * 60);
      expect(position[1]).toBeCloseTo(1000 + 1.85 * 60);
      expect(app.rotations[0]).toBeCloseTo(3 + 0.015 * 60);
    }
  });

  it("does not change speed when frame cadence changes during a theme switch", () => {
    const app = animation();
    app.window.startSakura();
    app.frame(0);
    for (let i = 1; i <= 60; i++) app.frame(i * 1000 / 60);
    let position: number[] = [];
    for (let i = 1; i <= 15; i++) position = app.frame(1000 + i * 1000 / 15);
    expect(position[0]).toBeCloseTo(1000 - 1.7 * 120);
    expect(position[1]).toBeCloseTo(1000 + 1.85 * 120);
  });

  it("discards hidden time even when the browser suspends all callbacks", () => {
    const app = animation();
    app.window.startSakura();
    app.frame(0);
    const before = app.frame(100);
    app.visibility(true);
    app.visibility(false);
    expect(app.frame(60100)).toEqual(before);
    expect(app.frame(60200)[1]).toBeCloseTo(before[1] + 1.85 * 6);
  });

  it("does not advance or redraw while hidden callbacks are delivered", () => {
    const app = animation();
    app.window.startSakura();
    const before = app.frame(0);
    app.visibility(true);
    expect(app.frame(1000)).toEqual(before);
    expect(app.frame(2000)).toEqual(before);
    app.visibility(false);
    expect(app.frame(3000)).toEqual(before);
  });

  it("does not discard visible time when Liquid compositing stalls for a second", () => {
    const app = animation();
    app.window.startSakura();
    const before = app.frame(0);
    expect(app.frame(1000)[1]).toBeCloseTo(before[1] + 1.85 * 60);
  });

  it("keeps one animation loop and resets its clock after stop/start", () => {
    const app = animation();
    app.window.startSakura();
    app.window.startSakura();
    expect(app.callbacks.size).toBe(1);
    app.frame(0);
    app.frame(100);
    app.window.stopSakura();
    expect(app.callbacks.size).toBe(0);
    app.window.startSakura();
    expect(app.frame(60000)).toEqual([1000, 1000]);
  });
});
