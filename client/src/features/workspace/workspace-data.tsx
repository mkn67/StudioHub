"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useApiSession } from "@/components/api-session";
import { useApiAction } from "@/components/api-ui";
import { loadWorkspaceData, submitWorkspaceCommand, type WorkspaceCommand } from "@/services/api/workspace-client";
import type { Workspace } from "@/services/api/workspace-contract";
import { ownedInventory, workspaceRooms, workspaceEquipment } from "@/services/api/workspace-contract";
type Resource = { data: Workspace | null; loading: boolean; error: string; reload: () => void };
const Context = createContext<Resource | null>(null);
export function WorkspaceDataProvider({ children }: { children: ReactNode }) {
  const { user } = useApiSession(); const userId = String(user!.user_id);
  const [revision, setRevision] = useState(0), [result, setResult] = useState<{ data: Workspace | null; error: string; key: string }>({ data: null, error: "", key: "" });
  const key = `${userId}:${revision}`;
  useEffect(() => {
    let active = true;
    loadWorkspaceData(userId).then(data => { if (active) setResult({ data, error: "", key }); }).catch(error => { if (active) setResult({ data: null, error: error instanceof Error ? error.message : "Không tải được dữ liệu quản lý.", key }); });
    return () => { active = false; };
  }, [key, userId]);
  const current = result.key === key;
  return <Context.Provider value={{ data: current ? result.data : null, error: current ? result.error : "", loading: !current, reload: () => setRevision(value => value + 1) }}>{children}</Context.Provider>;
}
export function useWorkspaceData() { const resource = useContext(Context); if (!resource) throw new Error("WorkspaceDataProvider missing"); return resource; }
export function useHostInventory() {
  const resource = useWorkspaceData(), { user } = useApiSession();
  try {
    const owned = resource.data ? ownedInventory(resource.data, String(user!.user_id)) : null;
    return { ...resource, data: owned && { ...owned, rooms: workspaceRooms(resource.data!, owned.rooms), equipment: workspaceEquipment(owned.equipment) } };
  } catch (error) { return { ...resource, data: null, loading: false, error: error instanceof Error ? error.message : "Dữ liệu tài nguyên không hợp lệ." }; }
}
export function useWorkspaceCommand() {
  const action = useApiAction(), { user } = useApiSession(); const keys = useRef(new Map<string, string>());
  return { ...action, execute: async (command: WorkspaceCommand, onSuccess: () => void) => action.run(async () => {
    const payload = JSON.stringify(command); const key = keys.current.get(payload) ?? crypto.randomUUID(); keys.current.set(payload, key);
    await submitWorkspaceCommand(command, String(user!.user_id), key); keys.current.delete(payload); onSuccess();
  }) };
}
