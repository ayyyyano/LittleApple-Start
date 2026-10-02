"use client";

import { useApp } from "@/components/providers/AppProvider";
import type { Locale } from "@/types/config";

const languages: Array<{ value: Locale; label: string; native: string }> = [
  { value: "zh-CN", label: "简体中文", native: "中国大陆" },
  { value: "zh-TW", label: "繁體中文", native: "台灣 / 香港" },
  { value: "en", label: "English", native: "English" },
];

export function LanguageSettings() {
  const { config, updateConfig } = useApp();
  return (
    <div className="language-grid" role="radiogroup" aria-label="Language">
      {languages.map((language) => (
        <button key={language.value} type="button" role="radio" aria-checked={config.locale === language.value} className={config.locale === language.value ? "is-active" : ""} onClick={() => updateConfig((current) => ({ ...current, locale: language.value }))}>
          <strong>{language.label}</strong><span>{language.native}</span>
        </button>
      ))}
    </div>
  );
}
