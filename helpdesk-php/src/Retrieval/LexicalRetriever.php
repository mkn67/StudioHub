<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\Retrieval;

use StudioHub\Helpdesk\Knowledge\Repository;
use StudioHub\Helpdesk\Security\Actor;

/**
 * Bộ truy xuất theo từ khóa (lexical) cho kho tri thức tiếng Việt.
 *
 * Cách hoạt động:
 *   1. Chuẩn hóa văn bản: chữ thường, bỏ dấu tiếng Việt, chỉ giữ chữ/số/dấu gạch dưới.
 *   2. Tách từ (token), đổi một số từ đồng nghĩa/viết tắt về dạng chuẩn và bỏ từ dừng.
 *   3. Chấm điểm từng mục tri thức: từ trùng với tiêu đề được 3 điểm, trùng với nội dung được 1 điểm.
 *   4. Lọc các mục đạt ngưỡng, sắp xếp theo điểm rồi giới hạn số lượng và tổng độ dài kết quả.
 */
final class LexicalRetriever
{
    /** Bảng bỏ dấu: chữ không dấu => các chữ có dấu tương ứng (dạng dựng sẵn). */
    private const ACCENT_MAP = [
        'a' => 'àáạảãâầấậẩẫăằắặẳẵ',
        'e' => 'èéẹẻẽêềếệểễ',
        'i' => 'ìíịỉĩ',
        'o' => 'òóọỏõôồốộổỗơờớợởỡ',
        'u' => 'ùúụủũưừứựửữ',
        'y' => 'ỳýỵỷỹ',
        'd' => 'đ',
    ];

    /**
     * Từ/cụm từ (đã bỏ dấu) => dạng chuẩn dùng khi tách từ.
     * LƯU Ý: thứ tự quan trọng vì str_replace thay lần lượt từ trên xuống.
     * Ví dụ "ko den" -> "khong den" (do 'ko ' được thay trước) -> "no_show".
     */
    private const SYNONYMS = [
        'ko '        => 'khong ',
        'khong den'  => 'no_show',
        'khong toi'  => 'no_show',
        'chu studio' => 'host',
        'tra phong'  => 'check out',
        'nhan phong' => 'check in',
        'doi gio'    => 'doi lich',
        'deposit'    => 'coc',
        'refund'     => 'hoan',
        'overtime'   => 'qua gio',
    ];

    /** Từ dừng (ít giá trị phân biệt), bị loại khỏi tập từ khóa. */
    private const STOP_WORDS = [
        'toi', 'co', 'duoc', 'khong', 'thi', 'la', 'va', 'cua', 'mot', 'cho', 'nay',
        'nao', 'the', 'voi', 'hay', 'phai', 'bao', 'nhieu', 'lam', 'sao', 'gi', 'ban',
    ];

    /**
     * Nhận diện ý định "đến trễ" (áp dụng trên văn bản đã bỏ dấu) để phân biệt
     * với các câu hỏi về phút đệm / quá giờ.
     */
    private const LATE_ARRIVAL_PATTERN = '/(?:den|toi)(?: studio)? (?:tre|muon)|cong them gio|dung bu/';

    // ---- Tham số chấm điểm ----

    private const TITLE_MATCH_POINTS = 3;   // Từ trùng với tiêu đề (hoặc chủ đề).
    private const BODY_MATCH_POINTS = 1;    // Từ trùng với nội dung.
    private const LATE_ARRIVAL_BONUS = 6;   // Cộng thêm cho mục "check-in trễ" khi người dùng hỏi về đến trễ.

    private const MIN_MATCHED_TERMS = 2;    // Số từ khóa tối thiểu phải khớp (nếu câu hỏi có ít hơn thì lấy theo số đó).
    private const MIN_SCORE = 0.45;         // Điểm trung bình trên mỗi từ khóa tối thiểu.
    private const SCORE_PRECISION = 4;      // Số chữ số thập phân khi làm tròn điểm.

    // ---- Giới hạn kết quả ----

    private const MAX_RESULTS = 5;          // Số mục tối đa trả về.
    private const MAX_CONTENT_CHARS = 5000; // Tổng độ dài nội dung tối đa của các mục trả về.

    public function __construct(private Repository $knowledge)
    {
    }

    /**
     * Chuẩn hóa văn bản: chữ thường, bỏ dấu tiếng Việt, chỉ giữ [a-z0-9_] và gom khoảng trắng.
     */
    public static function normalize(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');

        // Đổi chữ có dấu dựng sẵn về chữ không dấu.
        foreach (self::ACCENT_MAP as $plain => $letters) {
            $text = preg_replace('/[' . $letters . ']/u', $plain, $text) ?? '';
        }

        // Bỏ các dấu rời (combining marks), xuất hiện khi gõ tiếng Việt ở dạng tổ hợp (decomposed).
        $text = preg_replace('/\p{M}+/u', '', $text) ?? '';

        // Mọi ký tự còn lại ngoài [a-z0-9_] đều thành khoảng trắng.
        return trim(preg_replace('/[^a-z0-9_]+/', ' ', $text) ?? '');
    }

    /**
     * Tìm các mục tri thức phù hợp nhất với câu hỏi.
     *
     * @param string|null $studioId Giới hạn theo Studio (nếu có).
     * @param int         $k        Số mục tối đa mong muốn (bị kẹp trong khoảng 1-5).
     *
     * @return array Các mục tri thức kèm trường 'score', xếp theo điểm giảm dần (điểm bằng nhau thì theo id).
     */
    public function search(string $query, Actor $actor, ?string $studioId = null, int $k = self::MAX_RESULTS): array
    {
        $queryTokens = self::tokens($query);

        // Ý định "đến trễ" chỉ phụ thuộc câu hỏi nên tính một lần.
        $lateArrivalIntent = (bool) preg_match(self::LATE_ARRIVAL_PATTERN, self::normalize($query));

        $ranked = [];
        foreach ($this->knowledge->eligible($actor, $studioId) as $entry) {
            [$score, $matched] = self::score($queryTokens, $entry, $lateArrivalIntent);

            // Cần khớp đủ số từ khóa tối thiểu và đạt ngưỡng điểm.
            if ($matched >= min(self::MIN_MATCHED_TERMS, count($queryTokens))
                && $score >= self::MIN_SCORE
                && $matched > 0
            ) {
                $entry['score'] = round($score, self::SCORE_PRECISION);
                $ranked[] = $entry;
            }
        }

        // Điểm cao trước; bằng điểm thì xếp theo id để kết quả luôn ổn định.
        usort(
            $ranked,
            static fn ($a, $b) => ($b['score'] <=> $a['score']) ?: strcmp($a['id'], $b['id']),
        );

        // Lấy tối đa $k mục, dừng khi tổng độ dài nội dung vượt giới hạn.
        $results = [];
        $totalChars = 0;
        foreach (array_slice($ranked, 0, max(1, min(self::MAX_RESULTS, $k))) as $entry) {
            $totalChars += mb_strlen($entry['content']);
            if ($totalChars > self::MAX_CONTENT_CHARS) {
                break;
            }
            $results[] = $entry;
        }

        return $results;
    }

    /**
     * Chấm điểm một mục tri thức theo các từ khóa của câu hỏi.
     *
     * @return array{0: int|float, 1: int} [điểm trung bình trên mỗi từ khóa, số từ khóa khớp]
     */
    private static function score(array $queryTokens, array $entry, bool $lateArrivalIntent): array
    {
        $titleTokens = self::tokens($entry['title'] . ' ' . $entry['topic']);
        $bodyTokens = self::tokens($entry['content']);

        $points = 0;
        $matched = 0;

        foreach ($queryTokens as $token) {
            if (in_array($token, $titleTokens, true)) {
                $points += self::TITLE_MATCH_POINTS;
                $matched++;
            } elseif (in_array($token, $bodyTokens, true)) {
                $points += self::BODY_MATCH_POINTS;
                $matched++;
            }
        }

        // Giữ ý nghĩa của cụm từ: "đến trễ" khác với phút đệm / quá giờ,
        // nên ưu tiên mục check-in có tiêu đề nói về "trễ".
        if ($lateArrivalIntent
            && $entry['topic'] === 'checkin'
            && str_contains(self::normalize($entry['title']), 'tre')
        ) {
            $points += self::LATE_ARRIVAL_BONUS;
        }

        $score = $queryTokens ? $points / count($queryTokens) : 0;

        return [$score, $matched];
    }

    /**
     * Tách văn bản thành tập từ khóa: chuẩn hóa, đổi từ đồng nghĩa, bỏ từ dừng và từ trùng lặp.
     *
     * @return string[]
     */
    private static function tokens(string $text): array
    {
        $text = self::normalize($text);
        $text = str_replace(array_keys(self::SYNONYMS), array_values(self::SYNONYMS), $text);

        // array_diff loại từ dừng và chuỗi rỗng (do khoảng trắng thừa sau khi thay từ).
        $words = array_diff(explode(' ', trim($text)), self::STOP_WORDS, ['']);

        return array_values(array_unique($words));
    }
}