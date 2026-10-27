<?php

declare(strict_types=1);

namespace StudioHub\Helpdesk\Knowledge;

use StudioHub\Helpdesk\Failure;

/**
 * Dựng câu trả lời có trích dẫn nguồn (grounded answer) từ các "claim" do mô hình chọn.
 *
 * Nguyên tắc: sinh nội dung theo kiểu trích xuất (extractive). Mô hình chỉ được chọn
 * nguyên văn các đoạn đã được phê duyệt trong kho tri thức, không được diễn đạt lại,
 * vì phần diễn đạt lại về chính sách thì không thể kiểm chứng được.
 */
final class CitationBuilder
{
    /** Số claim tối đa trong một câu trả lời. */
    private const MAX_CLAIMS = 3;

    /** Độ dài tối thiểu (ký tự) của một đoạn trích. */
    private const MIN_QUOTE_LENGTH = 15;

    /**
     * @param array<int, array<string, mixed>>  $claims  Các claim do mô hình trả về,
     *                                                    mỗi claim gồm `chunk_id` và `text`.
     * @param array<string, array<string, mixed>> $chunks Các đoạn tri thức được phép dùng, khoá theo chunk_id.
     * @param string                             $version Phiên bản của kho tri thức (corpus).
     *
     * @return array{text: string, citations: array<int, array<string, mixed>>, sources: array<int, array<string, string>>}
     *
     * @throws Failure `ungrounded_response` (502) nếu bất kỳ claim nào không bám sát nguồn đã duyệt.
     */
    public static function answer(array $claims, array $chunks, string $version): array
    {
        // Phải có ít nhất 1 và nhiều nhất 3 claim
        if (!$claims || count($claims) > self::MAX_CLAIMS) {
            throw new Failure('ungrounded_response', 502);
        }

        $text      = [];    // Các đoạn văn bản cuối cùng ghép thành câu trả lời
        $citations = [];    // Danh sách trích dẫn (mỗi đoạn tri thức chỉ xuất hiện một lần)
        $seen      = [];    // Đánh dấu các chunk đã được trích dẫn

        foreach ($claims as $claim) {
            $chunk = $chunks[$claim['chunk_id'] ?? ''] ?? null;
            $quote = $claim['text'] ?? null;

            self::assertGrounded($chunk, $quote);

            $text[] = $quote;

            // Cùng một chunk được dùng nhiều lần thì chỉ ghi một trích dẫn
            if (isset($seen[$chunk['chunk_id']])) {
                continue;
            }
            $seen[$chunk['chunk_id']] = true;

            $citations[] = [
                'id'              => $chunk['chunk_id'],
                'documentId'      => $chunk['id'],
                'chunkId'         => $chunk['chunk_id'],
                'title'           => $chunk['title'],
                'reference'       => self::reference($chunk),
                'documentVersion' => $chunk['document_version'],
                'corpusVersion'   => $version,
                'scope'           => $chunk['studio_scope']['kind'],
                'studioId'        => $chunk['studio_scope']['studio_id'],
            ];
        }

        return [
            'text'      => implode("\n\n", $text),
            'citations' => $citations,
            // Dạng rút gọn của trích dẫn để hiển thị cho người dùng
            'sources'   => array_map(
                fn(array $citation) => [
                    'title'     => $citation['title'],
                    'reference' => $citation['reference'],
                ],
                $citations
            ),
        ];
    }

    /**
     * Kiểm tra một đoạn trích có bám sát nguồn đã duyệt hay không.
     *
     * @throws Failure `ungrounded_response` (502) nếu không hợp lệ.
     */
    private static function assertGrounded(?array $chunk, mixed $quote): void
    {
        // Điều kiện cơ bản của đoạn trích:
        // - chunk phải tồn tại trong danh sách được phép;
        // - là chuỗi, dài tối thiểu 15 ký tự;
        // - nằm nguyên văn trong nội dung chunk;
        // - bắt đầu bằng chữ in hoa hoặc chữ số (tức là một câu/đoạn hoàn chỉnh).
        if (
            !$chunk
            || !is_string($quote)
            || mb_strlen($quote) < self::MIN_QUOTE_LENGTH
            || !str_contains($chunk['content'], $quote)
            || !preg_match('/^[\p{Lu}\p{N}]/u', $quote)
        ) {
            throw new Failure('ungrounded_response', 502);
        }

        // Bắt buộc trích trọn vẹn cả đoạn gốc, không được chỉ chọn một phần,
        // để tránh bỏ sót điều kiện hoặc ngoại lệ đi kèm trong chính sách.
        if (trim($quote) !== trim($chunk['content'])) {
            throw new Failure('ungrounded_response', 502);
        }
    }

    /**
     * Ghép chuỗi tham chiếu nguồn của chunk, ví dụ: "Điều 3 · v2; Phụ lục A · v1".
     *
     * @param array<string, mixed> $chunk
     */
    private static function reference(array $chunk): string
    {
        return implode('; ', array_map(
            fn(array $source) => $source['reference'] . ' · v' . $source['version'],
            $chunk['sources']
        ));
    }
}