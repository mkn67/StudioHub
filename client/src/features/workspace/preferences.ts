export type WorkspacePreferences = { compact: boolean; reduceMotion: boolean };
export const defaultPreferences: WorkspacePreferences = { compact: false, reduceMotion: false };
export function parsePreferences(raw: string | null): WorkspacePreferences {
  try {
    const value = JSON.parse(raw ?? "null");
    return { compact: value?.compact === true, reduceMotion: value?.reduceMotion === true };
  } catch { return { ...defaultPreferences }; }
}
export function preferenceKey(role: "host" | "admin", userId: number) { return `studiohub.workspace.preferences.v1.${role}.${userId}`; }
