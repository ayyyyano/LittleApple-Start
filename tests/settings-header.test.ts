import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const settings = readFileSync(resolve(process.cwd(), "components/settings/SettingsPanel.tsx"), "utf8");
const dialog = readFileSync(resolve(process.cwd(), "components/ui/Dialog.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("Settings toolbar search contract", () => {
  it("places a single search field in the header, not the scrolling content", () => {
    expect(settings.match(/className="settings-search-box"/g)).toHaveLength(1);
    expect(settings).toMatch(/headerContent=\{[\s\S]*?className="settings-search-box"/);
    expect(settings.slice(settings.indexOf('<div className="settings-content"'))).not.toContain("settings-search-box");
  });

  it("retains a named dialog while replacing only its visible title", () => {
    expect(dialog).toContain('aria-labelledby={titleId}');
    expect(dialog).toContain('<h2 id={titleId} className={headerContent ? "sr-only" : undefined}>{title}</h2>');
    expect(settings).toContain('title={t("settings")}');
    expect(settings).toContain('aria-label={t("settingsSearchPlaceholder")}');
  });

  it("centers against the whole toolbar independently of sidebar width", () => {
    expect(css).toMatch(/\.settings-dialog > \.dialog-header \.dialog-header-title \{[^}]*inset-inline: 64px;[^}]*top: 50%;[^}]*translateY\(-50%\)/);
    expect(css).toMatch(/\.settings-search-box \{[^}]*width: 100%;[^}]*max-width: 520px;[^}]*min-width: 0;[^}]*pointer-events: auto/);
    expect(css).not.toMatch(/\.settings-dialog--sidebar-collapsed[^{}]*settings-search-box/);
  });
});
