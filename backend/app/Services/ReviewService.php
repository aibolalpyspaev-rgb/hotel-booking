<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Booking;
use App\Models\Review;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ReviewService
{
    public function list(array $filters): LengthAwarePaginator
    {
        return Review::query()
            ->with(['user:id,name', 'hotel:id,name,city,image_url'])
            ->when($filters['hotel_id'] ?? null, fn ($q, $id) => $q->where('hotel_id', $id))
            ->when($filters['user_id'] ?? null, fn ($q, $id) => $q->where('user_id', $id))
            ->when($filters['rating'] ?? null, fn ($q, $r) => $q->where('rating', (int) $r))
            ->when(($filters['sort'] ?? null) === 'rating', fn ($q) => $q->orderByDesc('rating'), fn ($q) => $q->latest())
            ->paginate(min((int) ($filters['per_page'] ?? 10), 50))
            ->withQueryString();
    }

    /** Отзыв можно оставить только по своему завершённому проживанию, один на бронь. */
    public function create(User $user, array $data): Review
    {
        /** @var Booking $booking */
        $booking = Booking::with('room')->findOrFail($data['booking_id']);

        if ($booking->user_id !== $user->id) {
            throw new BusinessException('Можно оставить отзыв только о своём проживании.', 403);
        }

        if ($booking->review()->exists()) {
            throw new BusinessException('Вы уже оставили отзыв об этом проживании.', 409);
        }

        if (! $booking->isReviewable()) {
            throw new BusinessException('Отзыв можно оставить после завершения проживания.', 422);
        }

        return Review::create([
            'user_id' => $user->id,
            'hotel_id' => $booking->room->hotel_id,
            'booking_id' => $booking->id,
            'rating' => $data['rating'],
            'comment' => $data['comment'],
        ])->load(['user:id,name', 'hotel:id,name,city,image_url']);
    }

    public function update(Review $review, array $data): Review
    {
        $review->update($data);

        return $review->load(['user:id,name', 'hotel:id,name,city,image_url']);
    }

    public function delete(Review $review): void
    {
        $review->delete();
    }
}
