declare module "aplayer" {
  interface APlayerAudio {
    name: string;
    artist: string;
    url: string;
    cover?: string;
    lrc?: string;
  }
  interface APlayerOptions {
    container: HTMLElement;
    audio: APlayerAudio[];
    autoplay?: boolean;
    theme?: string;
    loop?: "all" | "one" | "none";
    order?: "list" | "random";
    preload?: "none" | "metadata" | "auto";
    volume?: number;
    mutex?: boolean;
    lrcType?: number;
  }
  export default class APlayer {
    constructor(options: APlayerOptions);
    destroy(): void;
  }
}

declare module "aplayer/dist/APlayer.min.css";
