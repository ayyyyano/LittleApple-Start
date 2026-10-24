import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");
const floatingPlayer = readFileSync("components/player/FloatingPlayer.tsx", "utf8");

describe("floating player layout retention", () => {
  it("removes the retained hidden panel from the collapsed trigger flex layout", () => {
    expect(css).toMatch(/\.floating-player\.is-collapsed \.floating-player-panel\s*\{[^}]*position:\s*absolute;[^}]*inset-inline:\s*0;[^}]*bottom:\s*0;/);
    expect(floatingPlayer).toContain('hasOpened && <div className="floating-player-panel" aria-hidden={!expanded}');
    expect(css).toContain(".floating-player.is-collapsed.floating-player--left { justify-content: flex-start; }");
    expect(css).toContain(".floating-player.is-collapsed.floating-player--right { justify-content: flex-end; }");
  });

  it("reserves collapse-button space for both title and lyrics without shrinking the controller", () => {
    expect(css).toMatch(/\.floating-player-panel \.aplayer \.aplayer-info \.aplayer-music,\s*\.floating-player-panel \.aplayer \.aplayer-info \.aplayer-lrc\s*\{\s*margin-right:\s*44px;/);
    expect(css).not.toMatch(/\.floating-player-panel \.aplayer \.aplayer-info\s*\{[^}]*padding-right:/);
  });
});
