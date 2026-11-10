<?php

namespace App\Models;

use App\Enums\BookingStatus;
use App\Enums\RoomType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'hotel_id', 'name', 'type', 'description', 'price_per_night',
        'capacity', 'beds', 'area', 'image_url', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => RoomType::class,
            'is_active' => 'boolean',
            'price_per_night' => 'integer',
            'capacity' => 'integer',
            'beds' => 'integer',
            'area' => 'integer',
        ];
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'room_amenity');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where($this->qualifyColumn('is_active'), true);
    }

    /**
     * Номера, свободные на интервал [checkIn, checkOut).
     * Интервалы пересекаются, если existing.check_in < new.check_out И existing.check_out > new.check_in.
     */
    public function scopeAvailableBetween(Builder $query, string $checkIn, string $checkOut): Builder
    {
        return $query->whereDoesntHave('bookings', function (Builder $q) use ($checkIn, $checkOut) {
            $q->whereIn('status', BookingStatus::blocking())
                ->where('check_in', '<', $checkOut)
                ->where('check_out', '>', $checkIn);
        });
    }
}
