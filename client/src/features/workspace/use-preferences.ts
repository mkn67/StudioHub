"use client";
import { useSyncExternalStore } from "react";
import { defaultPreferences, parsePreferences, type WorkspacePreferences } from "./preferences";
const eventName = "studiohub:workspace-preferences";
const fallback = new Map<string, string>();
const defaults = JSON.stringify(defaultPreferences);
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener); window.addEventListener(eventName, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(eventName, listener); };
}
function snapshot(key: string) {
  if (fallback.has(key)) return fallback.get(key)!;
  try { return window.localStorage.getItem(key) ?? defaults; } catch { return defaults; }
}
export function useWorkspacePreferences(key: string) {
  const raw = useSyncExternalStore(subscribe, () => snapshot(key), () => defaults);
  function update(change: Partial<WorkspacePreferences>) {
    const value = JSON.stringify({ ...parsePreferences(snapshot(key)), ...change });
    let persisted = true;
    try { window.localStorage.setItem(key, value); fallback.delete(key); }
    catch { fallback.set(key, value); persisted = false; }
    window.dispatchEvent(new Event(eventName));
    return persisted;
  }
  return { preferences: parsePreferences(raw), update };
}
