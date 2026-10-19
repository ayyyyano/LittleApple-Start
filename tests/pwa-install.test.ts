import { afterEach, describe, expect, it, vi } from "vitest";
import { createPwaInstallController } from "@/lib/pwa-install";

function environment(secure = true, standalone = false) {
  const media = Object.assign(new EventTarget(), { matches: standalone });
  const browser = Object.assign(new EventTarget(), { isSecureContext: secure, matchMedia: () => media });
  vi.stubGlobal("window", browser);
  vi.stubGlobal("navigator", { standalone: false });
  return { browser, media };
}

function promptEvent(outcome: "accepted" | "dismissed" = "accepted") {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("PWA installation", () => {
  it("waits for the browser and prompts only after an explicit install action", async () => {
    const { browser } = environment();
    const controller = createPwaInstallController();
    const notify = vi.fn();
    controller.subscribe(notify);
    const stop = controller.start();
    expect(controller.getSnapshot()).toBe("unavailable");
    await controller.install();
    const event = promptEvent();
    browser.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(event.prompt).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toBe("ready");
    const result = controller.install();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    await result;
    expect(controller.getSnapshot()).toBe("accepted");
    await controller.install();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    browser.dispatchEvent(new Event("appinstalled"));
    expect(controller.getSnapshot()).toBe("installed");
    expect(notify).toHaveBeenCalled();
    stop();
  });

  it("consumes dismissed prompts and can accept a new browser event", async () => {
    const { browser } = environment();
    const controller = createPwaInstallController();
    const stop = controller.start();
    const first = promptEvent("dismissed");
    browser.dispatchEvent(first);
    await controller.install();
    expect(controller.getSnapshot()).toBe("dismissed");
    await controller.install();
    expect(first.prompt).toHaveBeenCalledTimes(1);
    browser.dispatchEvent(promptEvent());
    expect(controller.getSnapshot()).toBe("ready");
    stop();
  });

  it("handles rejection and does not overwrite a later appinstalled event", async () => {
    const { browser } = environment();
    const controller = createPwaInstallController();
    const stop = controller.start();
    const rejected = promptEvent();
    rejected.prompt.mockRejectedValueOnce(new Error("blocked"));
    browser.dispatchEvent(rejected);
    await controller.install();
    expect(controller.getSnapshot()).toBe("error");
    let resolveChoice!: (value: { outcome: "dismissed" }) => void;
    const pending = Object.assign(promptEvent(), { userChoice: new Promise<{ outcome: "dismissed" }>((resolve) => { resolveChoice = resolve; }) });
    browser.dispatchEvent(pending);
    const install = controller.install();
    browser.dispatchEvent(new Event("appinstalled"));
    resolveChoice({ outcome: "dismissed" });
    await install;
    expect(controller.getSnapshot()).toBe("installed");
    stop();
  });

  it("ignores an old result when a new installation event arrives", async () => {
    const { browser } = environment();
    const controller = createPwaInstallController();
    const stop = controller.start();
    let resolveChoice!: (value: { outcome: "dismissed" }) => void;
    browser.dispatchEvent(Object.assign(promptEvent(), { userChoice: new Promise<{ outcome: "dismissed" }>((resolve) => { resolveChoice = resolve; }) }));
    const old = controller.install();
    browser.dispatchEvent(promptEvent());
    resolveChoice({ outcome: "dismissed" });
    await old;
    expect(controller.getSnapshot()).toBe("ready");
    stop();
  });

  it("handles insecure origins, standalone mode, Safari standalone and unavailable events", () => {
    let env = environment(false);
    let controller = createPwaInstallController();
    let stop = controller.start();
    env.browser.dispatchEvent(promptEvent());
    expect(controller.getSnapshot()).toBe("insecure");
    stop();
    env = environment(true, true);
    controller = createPwaInstallController(); stop = controller.start();
    env.browser.dispatchEvent(promptEvent());
    expect(controller.getSnapshot()).toBe("installed");
    stop();
    env = environment();
    vi.stubGlobal("navigator", { standalone: true });
    controller = createPwaInstallController(); stop = controller.start();
    expect(controller.getSnapshot()).toBe("installed");
    stop();
    vi.stubGlobal("navigator", {});
    controller = createPwaInstallController(); stop = controller.start();
    env.browser.dispatchEvent(new Event("beforeinstallprompt"));
    expect(controller.getSnapshot()).toBe("unavailable");
    stop();
  });

  it("detaches listeners on cleanup and supports shared subscribers", () => {
    const { browser, media } = environment();
    const controller = createPwaInstallController();
    const first = controller.start(); const second = controller.start();
    first(); first();
    browser.dispatchEvent(promptEvent());
    expect(controller.getSnapshot()).toBe("ready");
    media.matches = true; media.dispatchEvent(new Event("change"));
    expect(controller.getSnapshot()).toBe("installed");
    second();
    browser.dispatchEvent(promptEvent());
    expect(controller.getSnapshot()).toBe("installed");
  });
});
