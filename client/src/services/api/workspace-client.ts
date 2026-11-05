import { apiRequest } from "./client";
import { parseReport, parseWorkspace } from "./workspace-contract";
import type { WorkspacePolicy, WorkspaceType } from "./workspace-contract";
export type WorkspaceCommand =
  | { type: "policy"; studioId: string; policy: WorkspacePolicy }
  | { type: "type_save"; roomType: Omit<WorkspaceType, "id"> & { id?: string } }
  | { type: "room_save"; room: { typeId: string; name: string; code: string; area: number; capacity: number; images: string[]; floor: string; feature: string; included: string[] } }
  | { type: "application"; studioName: string; address: string; description: string }
  | { type: "review_application"; id: string; approved: boolean; reason: string }
  | { type: "studio_status" | "room_status"; id: string; active: boolean; reason: string };
export async function loadWorkspaceData(userId: string) { return parseWorkspace(await apiRequest<unknown>("/api/workspace"), userId); }
export async function loadWorkspaceReport() { return parseReport(await apiRequest<unknown>("/api/reports")); }
export async function submitWorkspaceCommand(command: WorkspaceCommand, userId: string, key: string) {
  return parseWorkspace(await apiRequest<unknown>("/api/commands", { method: "POST", body: command, idempotencyKey: key }), userId);
}
