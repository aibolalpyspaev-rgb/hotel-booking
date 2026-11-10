<?php

namespace App\Models;

use App\Enums\BookingStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'user_id', 'room_id', 'check_in', 'check_out', 'guests', 'nights',
        'price_per_night', 'total_price', 'status', 'guest_name', 'guest_phone',
        'special_requests', 'confirmed_at', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'check_in' => 'date',
            'check_out' => 'date',
            'status' => BookingStatus::class,
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'guests' => 'integer',
            'nights' => 'integer',
            'price_per_night' => 'integer',
            'total_price' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    /** Можно ли отменить: активная бронь и до заезда минимум сутки. */
    public function isCancellable(): bool
    {
        return in_array($this->status->value, BookingStatus::blocking(), true)
            && $this->check_in->isAfter(today());
    }

    /** Можно ли оставить отзыв: проживание завершено и отзыва ещё нет. */
    public function isReviewable(): bool
    {
        $stayFinished = $this->status === BookingStatus::Completed
            || ($this->status === BookingStatus::Confirmed && ! $this->check_out->isAfter(today()));

        return $stayFinished && ! $this->review()->exists();
    }
}
