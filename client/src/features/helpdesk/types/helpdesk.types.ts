export type HelpdeskContext = { surface: "public" | "customer" | "host" | "admin" };
export type HelpdeskReference = { title: string; reference?: string; href?: string };
// Only a verified server transport may supply these read-only result cards.
export type HelpdeskCard =
  | { kind: "room"; title: string; roomId: string; description: string }
  | { kind: "availability"; title: string; description: string; checkedAt: string }
  | { kind: "booking"; title: string; bookingStatus: string; paymentStatus: string; refundStatus: string }
  | { kind: "ticket"; title: string; ticketId: string; status: string };
export type HelpdeskResponse = {
  text: string;
  mode: "demo" | "connected";
  state: "answered" | "unavailable" | "unauthorized" | "human_handoff";
  sources?: HelpdeskReference[];
  links?: { label: string; href: string }[];
  cards?: HelpdeskCard[];
  ticketProposal?: { id: string; description: string; category: string; suggestedDestination: string };
  handoffStatus?: "human_pending";
  operatorMessage?: boolean;
};
export type HelpdeskMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  response?: HelpdeskResponse;
};
export interface HelpdeskTransport {
  readonly mode: "demo" | "connected";
  readonly timeoutMs?: number;
  reset?(): void;
  confirmTicket?(proposalId: string, signal?: AbortSignal): Promise<HelpdeskResponse>;
  loadHistory?(signal?: AbortSignal): Promise<{ messages: HelpdeskMessage[]; state: string }>;
  sendMessage(message: string, context?: HelpdeskContext, options?: { signal?: AbortSignal; onStatus?: (status: "connecting" | "processing") => void }): Promise<HelpdeskResponse>;
}
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_MESSAGES = 60;

export function safeHelpdeskHref(href: string): string | undefined {
  // Do not render javascript:, data:, protocol-relative URLs or backslash redirects.
  if (/[\\\u0000-\u0020]/.test(href)) return undefined;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
