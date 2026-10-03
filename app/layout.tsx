import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LittleApple Start",
  description: "一个以个人背景、色彩和视觉构图为核心的本地优先浏览器起始页。",
  applicationName: "LittleApple Start",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaf4ff" },
    { media: "(prefers-color-scheme: dark)", color: "#07101f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <div id="startup-boot" aria-hidden="true" />
        {children}
        <div id="dialog-root" />
      </body>
    </html>
  );
}
