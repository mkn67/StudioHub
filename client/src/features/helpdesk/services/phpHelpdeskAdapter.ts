import type { HelpdeskContext, HelpdeskResponse, HelpdeskTransport, HelpdeskCard } from "../types/helpdesk.types";
export class HelpdeskApiError extends Error {
  constructor(public readonly reason: string, message: string) { super(message); }
}
const messages: Record<string, string> = {
  backend_unavailable: "Trợ lý hỗ trợ đang bận. Hãy thử lại sau.",
  bridge_not_configured: "Kết nối Trợ lý chưa được cấu hình.",
  provider_unavailable: "Nhà cung cấp AI chưa sẵn sàng. Chưa có thao tác nào được xác nhận.",
  provider_not_configured: "Cổng AI chưa được cấu hình.",
  invalid_provider_response: "Cổng AI trả về phản hồi không đúng định dạng. Vui lòng thử lại hoặc kiểm tra model đã chọn.",
  empty_provider_response: "Model chưa trả về nội dung. Vui lòng thử lại.",
  invalid_agent_response: "Model chưa trả đúng định dạng phản hồi sau khi yêu cầu sửa. Vui lòng thử lại hoặc chọn model hỗ trợ JSON và tool calling.",
  ungrounded_response: "Chưa xác minh được nguồn cho câu trả lời của AI. Mình chưa thể trả lời chính sách này.",
  model_not_configured: "Chưa cấu hình model cho cổng AI.",
  tool_calling_disabled: "Khả năng gọi công cụ đang tắt trong cấu hình Helpdesk.",
  tool_calling_unverified: "Cổng AI chưa được kiểm tra khả năng gọi công cụ. Trợ lý chưa thể trả lời.",
  generation_timeout: "AI phản hồi quá hạn. Bạn có thể thử lại cùng tin nhắn.",
  verified_contact_required: "Cần đăng nhập bằng tài khoản thực hoặc xác minh liên hệ trước khi tạo ticket.",
  authentication_required: "Cần đăng nhập bằng tài khoản hợp lệ.",
  resource_not_found: "Cuộc trò chuyện không còn khả dụng. Hãy xóa để bắt đầu lại.",
  rate_limited: "Bạn gửi quá nhiều yêu cầu. Vui lòng đợi một phút.",
  storage_unavailable: "Kho lưu trữ Helpdesk chưa sẵn sàng.",
};
type Json = Record<string, unknown>;
const record = (x: unknown): x is Json => !!x && typeof x === "object" && !Array.isArray(x);
const string = (x: unknown, max: number): x is string => typeof x === "string" && x.length > 0 && x.length <= max;
export function validateHelpdeskResponse(value: unknown): HelpdeskResponse {
  if (!record(value) || !string(value.text, 4000) || value.mode !== "connected" ||
    !["answered", "unavailable", "unauthorized", "human_handoff"].includes(String(value.state))) throw new HelpdeskApiError("invalid_response", "Phản hồi Helpdesk không hợp lệ.");
  const response: HelpdeskResponse = { text: value.text, mode: "connected", state: value.state as HelpdeskResponse["state"] };
  if (!Array.isArray(value.sources) || value.sources.length > 3) throw new HelpdeskApiError("invalid_response", "Nguồn tham chiếu không hợp lệ.");
  response.sources = value.sources.map(source => {
    if (!record(source) || !string(source.title, 250) || !string(source.reference, 500)) throw new HelpdeskApiError("invalid_response", "Nguồn tham chiếu không hợp lệ.");
    return { title: source.title, reference: source.reference };
  });
  if (value.cards !== undefined) {
    if (!Array.isArray(value.cards) || value.cards.length > 5) throw new HelpdeskApiError("invalid_response", "Thẻ kết quả không hợp lệ.");
    response.cards = value.cards.map((card): HelpdeskCard => {
      if (!record(card) || card.kind !== "room" || !string(card.title, 200) || !string(card.roomId, 30) || !string(card.description, 600)) throw new HelpdeskApiError("invalid_response", "Thẻ kết quả không hợp lệ.");
      return { kind: "room", title: card.title, roomId: card.roomId, description: card.description };
    });
  }
  if (value.ticketProposal !== undefined) {
    const p = value.ticketProposal;
    if (!record(p) || !string(p.id, 36) || !string(p.description, 1000) || !string(p.category, 40) || !string(p.suggestedDestination, 100)) throw new HelpdeskApiError("invalid_response", "Tóm tắt ticket không hợp lệ.");
    response.ticketProposal = { id: p.id, description: p.description, category: p.category, suggestedDestination: p.suggestedDestination };
  }
  if (value.handoffStatus === "human_pending") response.handoffStatus = "human_pending";
  if (value.operatorMessage === true) response.operatorMessage = true;
  return response;
}

export function createPhpHelpdeskAdapter(fetcher: typeof fetch = fetch): HelpdeskTransport {
  let conversationId: string | undefined;
  let retry: { text: string; key: string } | undefined;
  async function call(path: string, method: "GET" | "POST", body?: unknown, signal?: AbortSignal): Promise<Json> {
    const result = await fetcher("/api/helpdesk/" + path, {
      method, credentials: "same-origin", headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal, cache: "no-store",
    }).catch(() => { throw new HelpdeskApiError("backend_unavailable", messages.backend_unavailable); });
    const json: unknown = await result.json().catch(() => null);
    if (!result.ok || !record(json) || json.status !== "success" || !record(json.data)) {
      const reason = record(json) && Array.isArray(json.errors) && record(json.errors[0]) && typeof json.errors[0].code === "string" ? json.errors[0].code : "backend_unavailable";
      throw new HelpdeskApiError(reason, messages[reason] || "Yêu cầu Helpdesk chưa thành công. Vui lòng thử lại.");
    }
    return json.data;
  }
  return {
    mode: "connected", timeoutMs: 32000,
    reset() { conversationId = undefined; retry = undefined; },
    async sendMessage(text: string, context?: HelpdeskContext, options?) {
      if (!conversationId) {
        options?.onStatus?.("connecting");
        const data = await call("conversations", "POST", { locale: "vi-VN", context }, options?.signal);
        if (!record(data.conversation) || !string(data.conversation.id, 36)) throw new HelpdeskApiError("invalid_response", "Mã cuộc trò chuyện không hợp lệ.");
        conversationId = data.conversation.id;
      }
      if (!retry || retry.text !== text) retry = { text, key: crypto.randomUUID() };
      options?.onStatus?.("processing");
      const data = await call("conversations/" + conversationId + "/messages", "POST", { text, context, clientMessageId: retry.key }, options?.signal);
      const response = validateHelpdeskResponse(data.response);
      retry = undefined;
      return response;
    },
    async confirmTicket(proposalId: string, signal?: AbortSignal) {
      if (!conversationId) throw new HelpdeskApiError("resource_not_found", messages.resource_not_found);
      const data = await call("tickets", "POST", { conversationId, proposalId, clientMessageId: crypto.randomUUID(), confirmed: true }, signal);
      const t = data.ticket;
      if (!record(t) || !string(t.id, 36) || !string(t.status, 40)) throw new HelpdeskApiError("invalid_response", "Ticket chưa được xác nhận.");
      return { text: "Ticket đã được lưu trong hàng đợi chưa nhận. Chưa có Host hoặc nhân viên nào tiếp nhận.", mode: "connected", state: "answered", sources: [], cards: [{ kind: "ticket", title: "Phiếu hỗ trợ đã lưu", ticketId: t.id, status: t.status }] };
    },
    async loadHistory(signal?: AbortSignal) {
      if (!conversationId) return { messages: [], state: "bot_active" };
      const data = await call("conversations/" + conversationId + "?limit=60", "GET", undefined, signal);
      if (!record(data.conversation) || !string(data.conversation.state, 30) || !Array.isArray(data.messages) || data.messages.length > 60) throw new HelpdeskApiError("invalid_response", "Lịch sử trò chuyện không hợp lệ.");
      const messages = data.messages.map(message => {
        if (!record(message) || !string(message.id, 36) || !["user", "assistant"].includes(String(message.role)) || !string(message.text, 4000) || !string(message.createdAt, 50)) throw new HelpdeskApiError("invalid_response", "Lịch sử trò chuyện không hợp lệ.");
        return { id: message.id, role: message.role as "user" | "assistant", text: message.text, createdAt: message.createdAt,
          ...(message.response ? { response: validateHelpdeskResponse(message.response) } : {}) };
      });
      return { messages, state: data.conversation.state };
    },
  };
}
