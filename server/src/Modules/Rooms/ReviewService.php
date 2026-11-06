<?php

declare(strict_types=1);

namespace App\Modules\Rooms;

use App\Core\Db;
use App\Exceptions\ApiException;
use PDO;

final class ReviewService
{
    public function __construct(private readonly ?PDO $pdo = null) {}

    private function db(): PDO
    {
        return $this->pdo ?? Db::getConnection();
    }

    public function listForRoom(int $roomId): array
    {
        $db = $this->db();
        $room = $db->prepare("SELECT room_id FROM rooms WHERE room_id = ? AND status = 'active'");
        $room->execute([$roomId]);
        if (!$room->fetchColumn()) throw new ApiException(404, 'room_not_found', 'Phòng không tồn tại hoặc không khả dụng');

        $summary = $db->prepare("SELECT COUNT(*) AS review_count, COALESCE(AVG(rating), 0) AS average_rating FROM room_reviews WHERE room_id = ? AND status = 'published'");
        $summary->execute([$roomId]);
        $aggregate = $summary->fetch(PDO::FETCH_ASSOC) ?: ['review_count' => 0, 'average_rating' => 0];
        $items = $db->prepare("SELECT rr.review_id, rr.rating, rr.review_text, rr.created_at, 'Khách đã thuê' AS customer_name FROM room_reviews rr WHERE rr.room_id = ? AND rr.status = 'published' ORDER BY rr.created_at DESC, rr.review_id DESC LIMIT 30");
        $items->execute([$roomId]);
        $rows = $items->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$item) {
            $item['review_id'] = (int) $item['review_id'];
            $item['rating'] = (int) $item['rating'];
        }
        unset($item);
        return ['summary' => ['review_count' => (int) $aggregate['review_count'], 'average_rating' => round((float) $aggregate['average_rating'], 1)], 'items' => $rows];
    }

    public function getForBooking(int $bookingId, int $customerId): ?array
    {
        $stmt = $this->db()->prepare('SELECT rr.review_id, rr.booking_id, rr.room_id, rr.rating, rr.review_text, rr.created_at FROM room_reviews rr JOIN bookings b ON b.booking_id = rr.booking_id WHERE b.booking_id = ? AND b.customer_id = ?');
        $stmt->execute([$bookingId, $customerId]);
        $review = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$review) return null;
        foreach (['review_id', 'booking_id', 'room_id', 'rating'] as $field) $review[$field] = (int) $review[$field];
        return $review;
    }

    public function createForBooking(int $bookingId, int $customerId, array $payload): array
    {
        $rating = filter_var($payload['rating'] ?? null, FILTER_VALIDATE_INT);
        $rawText = $payload['review_text'] ?? '';
        if (!is_string($rawText)) throw new ApiException(400, 'invalid_review_text', 'Nội dung đánh giá phải là văn bản');
        $reviewText = trim($rawText);
        if ($rating === false || $rating < 1 || $rating > 5) throw new ApiException(400, 'invalid_rating', 'Điểm đánh giá phải từ 1 đến 5');
        $length = preg_match_all('/./us', $reviewText);
        if ($length === false || $length > 1200) throw new ApiException(400, 'review_too_long', 'Nội dung đánh giá tối đa 1200 ký tự');

        $db = $this->db();
        $booking = $db->prepare('SELECT room_id, status FROM bookings WHERE booking_id = ? AND customer_id = ?');
        $booking->execute([$bookingId, $customerId]);
        $row = $booking->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new ApiException(404, 'booking_not_found', 'Không tìm thấy đơn thuê');
        if ($row['status'] !== 'completed') throw new ApiException(409, 'booking_not_completed', 'Chỉ đơn đã hoàn tất mới được đánh giá');
        if ($this->getForBooking($bookingId, $customerId)) throw new ApiException(409, 'review_already_exists', 'Đơn thuê này đã được đánh giá');

        try {
            $insert = $db->prepare("INSERT INTO room_reviews (booking_id, room_id, customer_id, rating, review_text) VALUES (?, ?, ?, ?, ?)");
            $insert->execute([$bookingId, (int) $row['room_id'], $customerId, $rating, $reviewText]);
        } catch (\PDOException $error) {
            if ((string) $error->getCode() === '23000') throw new ApiException(409, 'review_already_exists', 'Đơn thuê này đã được đánh giá');
            throw $error;
        }
        return ['review_id' => (int) $db->lastInsertId(), 'booking_id' => $bookingId, 'room_id' => (int) $row['room_id'], 'rating' => $rating, 'review_text' => $reviewText];
    }
}
