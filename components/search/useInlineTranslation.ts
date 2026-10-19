"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { modelApiErrorCode, translateWithModel, type ModelApiErrorCode } from "@/lib/model-api";
import { createModelRequestSlot } from "@/lib/model-request";

type TranslationState = { scope: string; status: "loading" | "ready" | "error"; text?: string; error?: ModelApiErrorCode };

export function useInlineTranslation(query: string, open: boolean) {
  const { config, modelCredentials, credentialRevision } = useApp();
  const [requests] = useState(createModelRequestSlot);
  const [state, setState] = useState<TranslationState | null>(null);
  const { modelApi, aiTranslation } = config.labs;
  const profile = modelApi.profiles.find((item) => item.id === aiTranslation.profileId);
  const scope = JSON.stringify([open, query, modelApi.enabled, aiTranslation, profile, credentialRevision]);

  useEffect(() => () => requests.cancel(), [requests, scope]);
  const cancel = useCallback(() => {
    requests.cancel();
    setState(null);
  }, [requests]);

  async function translate() {
    if (!open || !aiTranslation.enabled || !query.trim()) return;
    const controller = requests.begin();
    if (!modelApi.enabled || !profile) {
      setState({ scope, status: "error", error: "not-configured" });
      return;
    }
    setState({ scope, status: "loading" });
    try {
      const text = await translateWithModel(profile, modelCredentials.get(profile), query, aiTranslation.targetLanguage, { signal: controller.signal });
      if (requests.isCurrent(controller)) setState({ scope, status: "ready", text });
    } catch (error) {
      if (requests.isCurrent(controller)) setState({ scope, status: "error", error: modelApiErrorCode(error) });
    }
  }

  return { state: state?.scope === scope ? state : null, translate, cancel };
}
