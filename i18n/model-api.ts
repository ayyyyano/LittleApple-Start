import type { MessageKey } from "@/i18n/resources";
import type { ModelApiErrorCode } from "@/lib/model-api";

export const MODEL_ERROR_MESSAGES: Record<ModelApiErrorCode, MessageKey> = {
  "not-configured": "modelErrorNotConfigured",
  "missing-key": "modelErrorMissingKey",
  "invalid-config": "modelErrorInvalidConfig",
  network: "modelErrorNetwork",
  unauthorized: "modelErrorUnauthorized",
  forbidden: "modelErrorForbidden",
  "rate-limit": "modelErrorRateLimit",
  server: "modelErrorServer",
  http: "modelErrorHttp",
  timeout: "modelErrorTimeout",
  "invalid-response": "modelErrorInvalidResponse",
  cancelled: "modelErrorCancelled",
};
