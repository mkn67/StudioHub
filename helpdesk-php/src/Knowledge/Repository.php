<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\Knowledge;

use StudioHub\Helpdesk\Failure;
use StudioHub\Helpdesk\Util;
use StudioHub\Helpdesk\Security\Actor;

/**
 * Kho tri thức (corpus) của helpdesk: nạp, kiểm tra và lọc các mục tri thức được phép dùng để trả lời.
 *
 * Gồm hai tệp JSON:
 *   - corpus:   danh sách các mục tri thức (entries) và phiên bản corpus.
 *   - manifest: danh sách phê duyệt (approvals) cho từng mục.
 *
 * Một mục chỉ được dùng khi (ngoài chế độ evaluation) có phê duyệt còn hiệu lực, nội dung và tài liệu
 * nguồn khớp với mã băm đã duyệt, hiển thị phù hợp với người dùng và không có xung đột.
 */
final class Repository
{
    /** Độ sâu JSON tối đa khi đọc tệp corpus/manifest. */
    private const JSON_MAX_DEPTH = 64;

    /** Độ dài tối đa (ký tự) nội dung một mục tri thức. */
    private const MAX_CONTENT_CHARS = 4000;

    /** Số ký tự mã băm dùng trong chunk_id. */
    private const CHUNK_HASH_LENGTH = 12;

    /** Các trường bắt buộc của một mục tri thức. */
    private const REQUIRED_ENTRY_KEYS = [
        'id', 'title', 'topic', 'content', 'document_version',
        'visibility', 'publication_status', 'sources', 'studio_scope', 'conflict_ids',
    ];

    /** Mức hiển thị hợp lệ: public (mọi người), customer, host, internal (không bao giờ trả cho người dùng). */
    private const VISIBILITIES = ['public', 'customer', 'host', 'internal'];

    /** Phạm vi áp dụng hợp lệ: toàn nền tảng hoặc theo từng Studio. */
    private const SCOPE_KINDS = ['platform', 'studio'];

    /** Trạng thái xuất bản. */
    private const STATUS_READY = 'ready_for_approval';
    private const STATUS_APPROVED = 'approved';

    /** Các mục tri thức đã được kiểm tra hợp lệ. */
    private array $entries;

    /** Nội dung manifest (danh sách phê duyệt); được nạp lại từ đĩa mỗi lần gọi eligible() ở chế độ thường. */
    private array $manifest;

    /** Phiên bản corpus, lấy từ tệp corpus. */
    public readonly string $version;

    /**
     * @param bool $evaluation Chế độ đánh giá: bỏ qua bước kiểm tra phê duyệt, chỉ dùng được khi chạy dòng lệnh.
     *
     * @throws Failure('evaluation_cli_only')   nếu bật evaluation ngoài CLI (403).
     * @throws Failure('knowledge_unavailable') nếu không đọc/giải mã được tệp (503).
     * @throws Failure('invalid_knowledge')     nếu dữ liệu sai cấu trúc (503).
     */
    public function __construct(
        private string $corpusPath,
        private string $manifestPath,
        private bool $evaluation = false,
    ) {
        if ($evaluation && PHP_SAPI !== 'cli') {
            throw new Failure('evaluation_cli_only', 403);
        }

        try {
            $corpus = json_decode(file_get_contents($corpusPath), true, self::JSON_MAX_DEPTH, JSON_THROW_ON_ERROR);
            $this->manifest = json_decode(file_get_contents($manifestPath), true, self::JSON_MAX_DEPTH, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            throw new Failure('knowledge_unavailable', 503);
        }

        if (!is_string($corpus['corpus_version'] ?? null)
            || !is_array($corpus['entries'] ?? null)
            || !is_array($this->manifest['approvals'] ?? null)
        ) {
            throw new Failure('invalid_knowledge', 503);
        }

        $this->version = $corpus['corpus_version'];
        $this->entries = [];

        $seenIds = []; // Dùng để phát hiện id trùng.
        foreach ($corpus['entries'] as $entry) {
            self::assertValidEntry($entry, $seenIds);
            $seenIds[$entry['id']] = true;
            $this->entries[] = $entry;
        }
    }

    /**
     * Trả về các mục tri thức mà $actor được phép dùng, mỗi mục có thêm trường 'chunk_id'.
     *
     * Điều kiện để một mục đủ tư cách:
     *   1. Mức hiển thị phù hợp với vai trò của người dùng.
     *   2. Đúng phạm vi Studio (mục theo Studio chỉ trả khi truyền đúng $studioId).
     *   3. Không có xung đột và đang ở trạng thái 'ready_for_approval' hoặc 'approved'.
     *   4. Đã được phê duyệt hợp lệ (xem isApproved()); ở chế độ evaluation thì chỉ cần 'ready_for_approval'.
     *
     * @param string|null $studioId Studio đang xét (nếu có).
     */
    public function eligible(Actor $actor, ?string $studioId = null): array
    {
        if (!$this->evaluation) {
            // Đọc lại manifest mỗi lần để việc thu hồi/hết hạn phê duyệt có hiệu lực ngay.
            // Không đọc được thì coi như không có tri thức nào dùng được.
            $latest = $this->readManifest();
            if ($latest === null) {
                return [];
            }
            $this->manifest = $latest;
        }

        $result = [];
        $now = time();

        foreach ($this->entries as $entry) {
            if (!self::isVisibleToRole($entry, $actor)
                || !self::isInStudioScope($entry, $studioId)
                || !self::isPublishable($entry)
            ) {
                continue;
            }

            $passes = $this->evaluation
                ? $entry['publication_status'] === self::STATUS_READY
                : $this->isApproved($entry, $now);

            if (!$passes) {
                continue;
            }

            // chunk_id gắn với id, phiên bản tài liệu và mã băm nội dung nên đổi nội dung là đổi chunk_id.
            // Lưu ý: mã băm phê duyệt đã được kiểm tra ở trên, trước khi thêm chunk_id.
            $entry['chunk_id'] = self::chunkId($entry);
            $result[] = $entry;
        }

        return $result;
    }

    /**
     * Mã băm SHA-256 của một mục tri thức.
     * Được so khớp với 'entry_sha256' trong manifest để phát hiện nội dung bị sửa sau khi duyệt.
     */
    public static function hash(array $entry): string
    {
        return hash('sha256', Util::json($entry));
    }

    // =====================================================================
    //  Kiểm tra dữ liệu khi nạp
    // =====================================================================

    /**
     * Kiểm tra cấu trúc một mục tri thức.
     *
     * @param array $seenIds Các id đã gặp (khóa là id), dùng phát hiện trùng.
     *
     * @throws Failure('invalid_knowledge') nếu mục không hợp lệ.
     */
    private static function assertValidEntry(array $entry, array $seenIds): void
    {
        foreach (self::REQUIRED_ENTRY_KEYS as $key) {
            if (!array_key_exists($key, $entry)) {
                throw new Failure('invalid_knowledge', 503);
            }
        }

        if (!is_string($entry['id'])
            || isset($seenIds[$entry['id']])
            || !is_string($entry['content'])
            || mb_strlen($entry['content']) > self::MAX_CONTENT_CHARS
            || !in_array($entry['visibility'], self::VISIBILITIES, true)
            || !is_array($entry['sources'])
            || !$entry['sources']              // Phải có ít nhất một nguồn.
            || !is_array($entry['conflict_ids'])
        ) {
            throw new Failure('invalid_knowledge', 503);
        }

        // Mỗi nguồn phải nêu rõ tài liệu, vị trí tham chiếu và phiên bản.
        foreach ($entry['sources'] as $source) {
            if (!is_string($source['document'] ?? null)
                || !is_string($source['reference'] ?? null)
                || !is_string($source['version'] ?? null)
            ) {
                throw new Failure('invalid_knowledge', 503);
            }
        }

        // Phạm vi hợp lệ; nếu theo Studio thì phải có studio_id.
        $scope = $entry['studio_scope'];
        if (!in_array($scope['kind'] ?? '', self::SCOPE_KINDS, true)
            || ($scope['kind'] === 'studio' && !is_string($scope['studio_id'] ?? null))
        ) {
            throw new Failure('invalid_knowledge', 503);
        }
    }

    // =====================================================================
    //  Điều kiện lọc trong eligible()
    // =====================================================================

    /**
     * Mức hiển thị có cho phép vai trò của người dùng thấy không?
     * 'internal' không bao giờ được trả; 'host' chỉ cho host; 'customer' chỉ cho khách hàng.
     */
    private static function isVisibleToRole(array $entry, Actor $actor): bool
    {
        return match ($entry['visibility']) {
            'internal' => false,
            'host'     => $actor->role === 'host',
            'customer' => $actor->role === 'customer',
            default    => true,
        };
    }

    /**
     * Mục theo Studio chỉ được trả khi người dùng truyền đúng Studio đó; mục toàn nền tảng luôn đạt.
     */
    private static function isInStudioScope(array $entry, ?string $studioId): bool
    {
        $scope = $entry['studio_scope'];

        return $scope['kind'] !== 'studio'
            || ($studioId !== null && $scope['studio_id'] === $studioId);
    }

    /**
     * Mục không có xung đột và đang ở trạng thái cho phép xuất bản.
     */
    private static function isPublishable(array $entry): bool
    {
        return !$entry['conflict_ids']
            && in_array($entry['publication_status'], [self::STATUS_READY, self::STATUS_APPROVED], true);
    }

    /**
     * Mục đã được phê duyệt hợp lệ trong manifest chưa?
     *
     * Cần đồng thời:
     *   - có bản ghi phê duyệt, manifest cùng phiên bản corpus, quyết định 'approved',
     *     có người duyệt, thời điểm duyệt hợp lệ và đã đến ngày hiệu lực (valid_from);
     *   - đúng phiên bản tài liệu và mã băm của mục khớp với mã đã duyệt;
     *   - còn hạn (valid_until) hoặc được đánh dấu không hết hạn (non_expiring);
     *   - các tài liệu nguồn không bị thay đổi so với mã băm đã duyệt (xem sourcesMatch()).
     */
    private function isApproved(array $entry, int $now): bool
    {
        $approval = $this->manifest['approvals'][$entry['id']] ?? null;

        if (!is_array($approval)
            || $this->manifest['corpus_version'] !== $this->version
            || ($approval['decision'] ?? '') !== 'approved'
            || empty($approval['approved_by'])
            || strtotime($approval['approved_at'] ?? '') === false
            || empty($approval['valid_from'])
            || strtotime($approval['valid_from']) === false
            || strtotime($approval['valid_from']) > $now
        ) {
            return false;
        }

        if (($approval['document_version'] ?? '') !== $entry['document_version']
            || !hash_equals($approval['entry_sha256'] ?? '', self::hash($entry))
        ) {
            return false;
        }

        if (($approval['non_expiring'] ?? false) !== true
            && (!is_string($approval['valid_until'] ?? null)
                || strtotime($approval['valid_until']) === false
                || strtotime($approval['valid_until']) <= $now)
        ) {
            return false;
        }

        return $this->sourcesMatch($entry, $approval);
    }

    /**
     * Mã định danh đoạn tri thức: "<id>@<phiên bản tài liệu>:<12 ký tự đầu mã băm nội dung>".
     */
    private static function chunkId(array $entry): string
    {
        return $entry['id'] . '@' . $entry['document_version'] . ':'
            . substr(hash('sha256', $entry['content']), 0, self::CHUNK_HASH_LENGTH);
    }

    // =====================================================================
    //  Đọc manifest và đối chiếu tài liệu nguồn
    // =====================================================================

    /**
     * Đọc lại manifest từ đĩa.
     *
     * @return array|null Manifest hợp lệ, hoặc null nếu không đọc được/sai cấu trúc.
     */
    private function readManifest(): ?array
    {
        try {
            $manifest = json_decode(file_get_contents($this->manifestPath), true, self::JSON_MAX_DEPTH, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }

        return is_array($manifest) && isset($manifest['corpus_version']) && is_array($manifest['approvals'] ?? null)
            ? $manifest
            : null;
    }

    /**
     * Kiểm tra các tài liệu nguồn của mục có đúng mã băm SHA-256 đã được duyệt hay không.
     * Đồng thời chặn đường dẫn trỏ ra ngoài thư mục gốc (path traversal).
     */
    private function sourcesMatch(array $entry, array $approval): bool
    {
        // Thư mục gốc của dự án: lên 4 cấp từ tệp corpus.
        $root = dirname($this->corpusPath, 4);

        foreach ($entry['sources'] as $source) {
            $file = realpath($root . '/' . $source['document']);

            // Tệp phải tồn tại và nằm bên trong thư mục gốc (chuẩn hóa dấu '\' để chạy được cả trên Windows).
            if (!$file
                || !str_starts_with(str_replace('\\', '/', $file), str_replace('\\', '/', $root) . '/')
                || !hash_equals($approval['source_sha256'][$source['document']] ?? '', hash_file('sha256', $file))
            ) {
                return false;
            }
        }

        return true;
    }
}