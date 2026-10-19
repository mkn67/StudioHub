import { createSeed } from "@/services/seed/data";
import { localDate, addDays, vietnamInstant } from "@/lib/format";
import { BrowserAdapter, MemoryStorage } from "@/services/storage/adapter";
import { StudioService } from "@/services/service";
import type { BookingRequest, Database } from "@/domain/schema";
export const NOW = Date.parse("2026-10-09T01:00:00Z");
export const fixture = () => createSeed(NOW);
export const request = (
  db: Database,
  values: Partial<BookingRequest> = {},
): BookingRequest => ({
  roomId: "room-1",
  rateId: "rate-room-1-hour",
  start: vietnamInstant(addDays(localDate(NOW), 10), "09:00"),
  end: vietnamInstant(addDays(localDate(NOW), 10), "11:00"),
  participants: 2,
  equipment: [],
  ...values,
});
export function serviceFixture() {
  const persistent = new MemoryStorage(),
    session = new MemoryStorage(),
    adapter = new BrowserAdapter(persistent, session, "studiohub.test.unit"),
    service = new StudioService(() => NOW);
  service.initialize(adapter);
  return { service, adapter, persistent, session };
}
