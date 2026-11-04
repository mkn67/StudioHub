import type { HostEquipment, HostRate } from "./host-types";
export type RetirementTarget =
  | { kind: "equipment"; equipment: Pick<HostEquipment, "equipment_id" | "name"> }
  | { kind: "rate"; rate: HostRate; roomId: string; roomName: string };
function resourceId(value: number | string) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw new Error("Không xác định được tài nguyên cần cập nhật.");
  return Number(value);
}
export function retirementRequest(target: RetirementTarget) {
  return {
    path: target.kind === "equipment" ? `/api/equipments/${resourceId(target.equipment.equipment_id)}` : `/api/rooms/${resourceId(target.roomId)}/rates/${resourceId(target.rate.rate_id)}`,
    method: "PATCH" as const,
    body: { status: "inactive" as const },
  };
}
