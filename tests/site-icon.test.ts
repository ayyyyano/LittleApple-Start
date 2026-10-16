import { describe, expect, it } from "vitest";

import { findDeclaredSiteIcon, isPrivateOrReservedIp } from "@/lib/site-icon";

describe("declared site icon discovery", () => {
  it("resolves an explicitly declared relative icon", () => {
    const html = '<html><head><link rel="icon" href="assets/site.png" sizes="32x32"></head></html>';
    expect(findDeclaredSiteIcon(html, "https://example.com/path/page")).toBe(
      "https://example.com/path/assets/site.png",
    );
  });

  it("prefers the desktop icon relation over touch fallbacks", () => {
    const html = `
      <head>
        <link href="/small.png" rel="shortcut icon" sizes="16x16">
        <link rel="apple-touch-icon" href="/touch.png" sizes="180x180">
      </head>
    `;
    expect(findDeclaredSiteIcon(html, "https://example.com/app")).toBe(
      "https://example.com/small.png",
    );
  });

  it("honors the document base URL when resolving a declared icon", () => {
    const html = `
      <head>
        <base href="https://static.example.com/assets/">
        <link rel="icon" href="site.png">
      </head>
    `;
    expect(findDeclaredSiteIcon(html, "https://example.com/app/")).toBe(
      "https://static.example.com/assets/site.png",
    );
  });

  it("prefers scalable declared icons", () => {
    const html = `
      <head>
        <link rel="icon" href="/small.png" sizes="64x64">
        <link rel="icon" href="/mark.svg" type="image/svg+xml">
      </head>
    `;
    expect(findDeclaredSiteIcon(html, "https://example.com/")).toBe(
      "https://example.com/mark.svg",
    );
  });

  it("returns null instead of guessing favicon paths", () => {
    const html = "<html><head><title>No icon</title></head><body></body></html>";
    expect(findDeclaredSiteIcon(html, "https://example.com/products/")).toBeNull();
  });

  it("ignores unsafe or malformed icon declarations", () => {
    const html = `
      <head>
        <link rel="icon" href="javascript:alert(1)">
        <link rel="icon" href="data:image/png;base64,AAAA">
      </head>
    `;
    expect(findDeclaredSiteIcon(html, "https://example.com/")).toBeNull();
  });
});

describe("site icon network boundary", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "fc00::1",
    "fe80::1",
  ])("rejects private or reserved address %s", (address) => {
    expect(isPrivateOrReservedIp(address)).toBe(true);
  });

  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])(
    "allows public address %s",
    (address) => {
      expect(isPrivateOrReservedIp(address)).toBe(false);
    },
  );
});
