export type PwaInstallStatus = "checking" | "unavailable" | "insecure" | "ready" | "prompting" | "accepted" | "dismissed" | "installed" | "error";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Keeps the browser's single-use install event until the user clicks Install. */
export function createPwaInstallController() {
  let status: PwaInstallStatus = "checking";
  let pending: InstallPromptEvent | null = null;
  let generation = 0;
  let users = 0;
  let detach: (() => void) | null = null;
  const subscribers = new Set<() => void>();
  const update = (next: PwaInstallStatus) => {
    if (status === next) return;
    status = next;
    subscribers.forEach((notify) => notify());
  };

  return {
    getSnapshot: () => status,
    getServerSnapshot: (): PwaInstallStatus => "checking",
    subscribe(notify: () => void) {
      subscribers.add(notify);
      return () => { subscribers.delete(notify); };
    },
    start() {
      if (typeof window === "undefined") return () => undefined;
      users += 1;
      if (users === 1) {
        const media = window.matchMedia("(display-mode: standalone)");
        const standalone = () => media.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
        const installed = () => { pending = null; generation += 1; update("installed"); };
        const displayChanged = () => {
          if (standalone()) installed();
          else if (status === "installed") update(window.isSecureContext ? "unavailable" : "insecure");
        };
        const beforeInstall = (event: Event) => {
          const candidate = event as InstallPromptEvent;
          if (!window.isSecureContext || standalone() || typeof candidate.prompt !== "function" || typeof candidate.userChoice?.then !== "function") return;
          event.preventDefault();
          pending = candidate;
          generation += 1;
          update("ready");
        };
        window.addEventListener("beforeinstallprompt", beforeInstall);
        window.addEventListener("appinstalled", installed);
        media.addEventListener("change", displayChanged);
        update(standalone() ? "installed" : window.isSecureContext ? "unavailable" : "insecure");
        detach = () => {
          window.removeEventListener("beforeinstallprompt", beforeInstall);
          window.removeEventListener("appinstalled", installed);
          media.removeEventListener("change", displayChanged);
          pending = null;
          generation += 1;
        };
      }
      let stopped = false;
      return () => {
        if (stopped) return;
        stopped = true;
        users -= 1;
        if (users === 0) { detach?.(); detach = null; }
      };
    },
    async install() {
      if (!pending || status !== "ready") return;
      const event = pending;
      const attempt = generation;
      pending = null;
      update("prompting");
      try {
        await event.prompt();
        const choice = await event.userChoice;
        if (attempt === generation) update(choice.outcome === "accepted" ? "accepted" : "dismissed");
      } catch {
        if (attempt === generation) update("error");
      }
    },
  };
}

export const pwaInstall = createPwaInstallController();
