import type { Metadata } from "next";
import { RoomDetail } from "@/features/marketplace/marketplace";
import { createSeed } from "@/services/seed/data";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params,
    room = createSeed().rooms.find((r) => r.slug === slug);
  return {
    title: room?.name ?? "Thông tin Studio",
    description: room?.description ?? "Xem thông tin Studio trong bản demo.",
    openGraph: { images: room?.images[0] ? [room.images[0]] : [] },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RoomDetail slug={slug} />;
}
