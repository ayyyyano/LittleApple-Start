"use client";

import { useSyncExternalStore } from "react";
import { getDesktopCursorSupport, subscribeToDesktopCursorSupport } from "@/lib/custom-cursor";

export function useDesktopCursorSupport(): boolean {
  return useSyncExternalStore(subscribeToDesktopCursorSupport, getDesktopCursorSupport, () => false);
}
