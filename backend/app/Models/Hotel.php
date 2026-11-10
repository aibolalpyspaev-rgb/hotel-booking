<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Hotel extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'city', 'address', 'description', 'short_description', 'stars', 'rating',
        'image_url', 'gallery', 'phone', 'email', 'check_in_time', 'check_out_time', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'gallery' => 'array',
            'is_active' => 'boolean',
            'stars' => 'integer',
            'rating' => 'float',
        ];
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where($this->qualifyColumn('is_active'), true);
    }

    /** Пересчитывает средний рейтинг отеля по отзывам. */
    public function recalculateRating(): void
    {
        $this->rating = round((float) $this->reviews()->avg('rating'), 2);
        $this->saveQuietly();
    }
}
