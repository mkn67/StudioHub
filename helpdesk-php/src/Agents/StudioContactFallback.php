<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\Agents;

use StudioHub\Helpdesk\Tools\PublicCatalog;
use StudioHub\Helpdesk\Retrieval\LexicalRetriever;

/** Read-only fallback. No assignment, ticket, account data or model-authored contact. */
final class StudioContactFallback
{
    public static function explicit(string $text): bool
    {
        $text = LexicalRetriever::normalize($text);
        if (preg_match('/\b(khong|chua) (can|muon) (lien he|gap|noi chuyen)\b/', $text)) return false;
        return $text === '/handoff' || (bool)preg_match('/\b(lien he|so dien thoai|email|hotline|gap nhan vien|gap nguoi that|noi chuyen voi nhan vien|ho tro truc tiep|human|contact)\b/', $text);
    }

    public static function insufficient(array $e): bool
    {
        if (!empty($e['verifiedConflict'])) return true;
        if (!empty($e['knowledgeSearched']) && empty($e['chunks'])) return true;
        foreach ($e['roomFacts'] ?? [] as $facts) if (!empty($facts['missingFields'])) return true;
        foreach ($e['rates'] ?? [] as $rates) if (empty($rates['rates'])) return true;
        return false;
    }

    /** Conservative refusal requires two distinct retrieved claims, never invented source IDs. */
    public static function verifyConflict(array $ids, array $e): bool
    {
        if (count($ids) < 2 || count($ids) > 3 || count(array_unique($ids)) !== count($ids)) return false;
        $contents = [];
        foreach ($ids as $id) {
            $chunk = $e['chunks'][$id] ?? null;
            if (!is_array($chunk) || !is_string($chunk['content'] ?? null)) return false;
            $contents[] = trim($chunk['content']);
        }
        return count(array_unique($contents)) > 1;
    }

    public static function resolve(PublicCatalog $catalog, array $e, string $reason): array
    {
        $c = ['reason'=>$reason, 'status'=>'ambiguous', 'studioId'=>null, 'studioName'=>null,
            'roomId'=>null, 'publicPhone'=>null, 'publicEmail'=>null];
        // A failed/ambiguous explicit resolution must never fall back to the page Studio.
        $match = $e['resolvedRooms']['match'] ?? null;
        if (!empty($e['agentState']['selectionRequired']) || ($match !== null && $match !== 'unique')) return $c;
        $ids = array_unique(array_merge(array_keys($e['roomFacts'] ?? []), array_column($e['rates'] ?? [], 'roomId'), array_keys($e['rooms'] ?? [])));
        if (count($ids) > 1 || count($e['rooms'] ?? []) > 1) return $c;
        if ($match !== 'unique' && !$ids && isset($e['context']['roomId']) && empty($e['viewedRoom'])) {
            throw new \StudioHub\Helpdesk\Failure('catalog_unavailable',503);
        }
        $id = $match === 'unique' ? ($e['resolvedRooms']['items'][0]['roomId'] ?? null)
            : ($ids[0] ?? $e['viewedRoom']['roomId'] ?? $e['agentState']['selectedRoomId'] ?? null);
        if (!$id || !$catalog->enabled()) return $c;
        $contact = $catalog->publicContact((int)$id); // Revalidate active Room → Studio on every call.
        return array_replace($c, $contact, ['status'=>$contact['publicPhone'] || $contact['publicEmail'] ? 'available' : 'missing']);
    }

    public static function response(array $contact): array
    {
        $text = "**Liên hệ Studio để được hỗ trợ**\n\n";
        if ($contact['status'] === 'ambiguous') $text .= 'Bạn muốn liên hệ Studio hoặc phòng nào? Vui lòng chọn một phòng để mình tra đúng liên hệ công khai.';
        else {
            $text .= $contact['reason'] === 'explicit_contact_request'
                ? 'Bạn có thể liên hệ trực tiếp với Studio qua thông tin công khai bên dưới.'
                : 'Hiện tại mình chưa có đủ thông tin để trả lời chính xác câu hỏi của bạn. Bạn vui lòng liên hệ trực tiếp với Studio để được hỗ trợ thêm.';
            if ($contact['status'] === 'missing') $text .= "\n\nHiện chưa có thông tin liên hệ công khai của Studio. Bạn có thể xem trang chi tiết phòng.";
        }
        return array_replace(AgentOrchestrator::base($text, 'answered'), ['answerKind'=>'studio_contact_fallback',
            'reasonCode'=>$contact['reason'], 'contactFallback'=>$contact]);
    }
}
