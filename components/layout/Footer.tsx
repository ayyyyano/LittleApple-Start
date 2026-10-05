"use client";

import { useApp } from "@/components/providers/AppProvider";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { isSafeHttpUrl } from "@/lib/validation";

export function Footer({ onAbout }: { onAbout: () => void }) {
  const { config, t } = useApp();
  const footer = config.content.footer;
  const legalItems = [
    { key: "icp", text: footer.icpText, href: footer.icpUrl, enabled: footer.showIcp },
    { key: "police", text: footer.policeText, href: footer.policeUrl, enabled: footer.showPolice },
  ].filter((item) => item.enabled && item.text.trim());
  return (
    <footer className="site-footer">
      <button type="button" onClick={onAbout}>{t("about")}</button>
      {footer.showLegal && legalItems.map((item) => (
        <span className="footer-item" key={item.key}>
          <span aria-hidden="true">·</span>
          {isSafeHttpUrl(item.href) ? <ExternalLink href={item.href}>{item.text}</ExternalLink> : <span>{item.text}</span>}
        </span>
      ))}
      {footer.showCopyright && footer.copyrightText.trim() && <span className="footer-copyright">{footer.copyrightText}</span>}
    </footer>
  );
}
