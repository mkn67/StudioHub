import { SearchResults } from "@/features/marketplace/marketplace";
import { BackendSearchResults } from "@/features/marketplace/backend-pages";
import { backendEnabled } from "@/services/api/client";

export const metadata = { title: "Khám phá phòng Studio" };

export default function Page() {
  return backendEnabled ? <BackendSearchResults /> : <SearchResults />;
}
