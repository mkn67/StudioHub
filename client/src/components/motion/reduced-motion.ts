"use client";
import { useSyncExternalStore } from "react";

let preference: MediaQueryList | undefined;
function media() {
  if (typeof window === "undefined") return undefined;
  return preference ??= window.matchMedia("(prefers-reduced-motion: reduce)");
}
function subscribe(update: () => void) {
  const query = media();
  query?.addEventListener("change", update);
  return () => query?.removeEventListener("change", update);
}
const snapshot = () => media()?.matches ?? true;
const serverSnapshot = () => true;

/** Live preference changes rerender utility scopes, including active exits. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
