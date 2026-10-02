"use client";

import Image from "next/image";
import { useApp } from "@/components/providers/AppProvider";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { DEFAULT_SITE_NAME, useAvatarUrl } from "@/components/settings/SiteIdentitySettings";

export function AboutSettings() {
  const { config, assetRevision, t } = useApp();
  const avatarUrl = useAvatarUrl(config.siteIdentity.avatarAssetId, assetRevision);
  return (
    <div className="about-panel">
      <header className="about-brand">
        <Image className="about-logo" src={avatarUrl ?? "/favicon.ico"} alt="LittleApple Start" width={72} height={72} priority={false} unoptimized />
        <div><h4>{DEFAULT_SITE_NAME}</h4><span className="about-edition">{t("communityEdition")}</span><p>{t("version")}</p></div>
      </header>
      <div className="about-content-grid">
        <section className="about-copy">
          <p className="about-description">{t("aboutDescription")}</p>
        </section>
        <section className="about-copy">
          <h5>{t("project")}</h5>
          <div className="about-links about-links--primary">
            <ExternalLink modalDepth="nested" href="https://www.littleapple.top/">{t("website")}</ExternalLink>
            <ExternalLink modalDepth="nested" href="https://github.com/ayyyyano/LittleApple-Start">{t("communityEditionSource")}</ExternalLink>
            <ExternalLink modalDepth="nested" href="https://opensource.org/license/mit">{t("mitLicense")}</ExternalLink>
            <ExternalLink modalDepth="nested" href="https://www.littleapple.top/bzwz/yqlj.html">{t("friendLinks")}</ExternalLink>
            <ExternalLink modalDepth="nested" href="https://www.littleapple.top/bzwz/yd.html">{t("productSeries")}</ExternalLink>
          </div>
        </section>
        <section className="about-copy about-legal-links">
          <h5>{t("legal")}</h5>
          <div className="about-links">
            <ExternalLink modalDepth="nested" href="https://beian.miit.gov.cn/">{t("legalRecord")}</ExternalLink>
            <ExternalLink modalDepth="nested" href="https://beian.mps.gov.cn/#/query/webSearch?code=35070202100245">{t("policeRecord")}</ExternalLink>
          </div>
        </section>
        <section className="about-copy">
          <h5>{t("openSourceProjectsServices")}</h5>
          <div className="open-source-list">
            <div className="open-source-row">
              <div className="open-source-info"><strong>@samasante/liquid-glass</strong><span>{t("liquidGlassPurpose")}</span><small>{t("component")} · MIT</small></div>
              <ExternalLink modalDepth="nested" iconOnly ariaLabel={t("sourceCode")} href="https://github.com/samasante/liquid-glass">{t("sourceCode")}</ExternalLink>
            </div>
            <div className="open-source-row">
              <div className="open-source-info"><strong>@DIYgod/APlayer</strong><span>{t("aplayerPurpose")}</span><small>{t("component")} · MIT</small></div>
              <ExternalLink modalDepth="nested" iconOnly ariaLabel={t("sourceCode")} href="https://github.com/DIYgod/APlayer">{t("sourceCode")}</ExternalLink>
            </div>
            <div className="open-source-row">
              <div className="open-source-info"><strong>@hitokoto-osc/hitokoto-api</strong><span>{t("hitokotoPurpose")}</span><small>{t("service")} · Apache-2.0</small></div>
              <ExternalLink modalDepth="nested" iconOnly ariaLabel={t("sourceCode")} href="https://github.com/hitokoto-osc/hitokoto-api">{t("sourceCode")}</ExternalLink>
            </div>
          </div>
        </section>
        <p className="about-copyright">{t("copyright")}</p>
      </div>
    </div>
  );
}
