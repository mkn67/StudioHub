import Link from "next/link";
import type { ReactNode } from "react";

export type RoomListingCardModel = {
  href: string;
  image: ReactNode;
  title: string;
  studio: string;
  district: string;
  type: string;
  details: string;
  rating?: { average: number; count: number };
  amenities: string[];
  price: string;
  priceContext?: string;
  badge?: string;
};

export function RoomListingCard({ room, className = "" }: { room: RoomListingCardModel; className?: string }) {
  return <Link className={`room-listing-card ${className}`} href={room.href}>
    <div className="room-listing-image">
      {room.image}
      {room.badge && <span className="room-listing-badge">{room.badge}</span>}
    </div>
    <div className="room-listing-copy">
      <p className="room-listing-location">{room.studio} · {room.district}</p>
      <h3>{room.title}</h3>
      {room.rating && room.rating.count > 0 && <p className="room-listing-rating" aria-label={`${room.rating.average.toFixed(1)} trên 5 sao, ${room.rating.count} đánh giá`}><span aria-hidden="true">★</span> {room.rating.average.toFixed(1)} <small>({room.rating.count} đánh giá)</small></p>}
      <p className="room-listing-meta">{room.type} · {room.details}</p>
      {room.amenities.length > 0 && <ul className="room-listing-amenities" aria-label="Tiện ích nổi bật">{room.amenities.slice(0, 3).map((amenity, index) => <li key={`${amenity}-${index}`}>{amenity}</li>)}</ul>}
      <div className="room-listing-price"><strong>{room.price}</strong>{room.priceContext && <small>{room.priceContext}</small>}<span aria-hidden="true">Xem phòng →</span></div>
    </div>
  </Link>;
}

export function RoomListingSkeleton({ compact = false }: { compact?: boolean }) {
  return <div className={`room-listing-skeleton ${compact ? "compact" : ""}`} aria-hidden="true"><span/><div><i/><b/><i/><i/></div></div>;
}
