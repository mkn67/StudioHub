import type { Metadata } from "next";
import { RoomDetail } from "@/features/marketplace/marketplace";
import { BackendRoomDetail } from "@/features/marketplace/backend-pages";
import { apiBaseUrl, backendEnabled } from "@/services/api/client";
import { createSeed } from "@/services/seed/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (backendEnabled) {
    try {
      const serverApiUrl = process.env.API_INTERNAL_URL ?? apiBaseUrl;
      const response = await fetch(`${serverApiUrl}/api/rooms/${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json();
      return {
        title: payload.data?.name ?? "Thông tin phòng Studio",
        description: payload.data?.description ?? "Thông tin phòng từ StudioHub.",
        openGraph: { images: payload.data?.images?.[0]?.image_url ? [payload.data.images[0].image_url] : [] },
      };
    } catch {
      return { title: "Thông tin phòng Studio" };
    }
  }
  const room = createSeed().rooms.find((item) => item.slug === id || item.id === id);
  return {
    title: room?.name ?? "Thông tin Studio",
    description: room?.description ?? "Xem thông tin Studio trong bản demo.",
    openGraph: { images: room?.images[0] ? [room.images[0]] : [] },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return backendEnabled ? <BackendRoomDetail id={id} /> : <RoomDetail slug={id} />;
}
