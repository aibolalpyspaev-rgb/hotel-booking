<?php

namespace App\Services;

use App\Models\Room;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class RoomService
{
    public function search(array $filters, bool $includeInactive = false): LengthAwarePaginator
    {
        $query = Room::query()
            ->with(['hotel:id,name,city,stars,rating,image_url', 'amenities'])
            ->when(! $includeInactive, fn ($q) => $q->active()->whereHas('hotel', fn ($h) => $h->active()))
            ->when($filters['hotel_id'] ?? null, fn ($q, $id) => $q->where('hotel_id', $id))
            ->when($filters['type'] ?? null, fn ($q, $type) => $q->where('type', $type))
            ->when($filters['city'] ?? null, fn ($q, $city) => $q->whereHas('hotel', fn ($h) => $h->where('city', $city)))
            ->when($filters['guests'] ?? null, fn ($q, $g) => $q->where('capacity', '>=', (int) $g))
            ->when($filters['min_price'] ?? null, fn ($q, $p) => $q->where('price_per_night', '>=', (int) $p))
            ->when($filters['max_price'] ?? null, fn ($q, $p) => $q->where('price_per_night', '<=', (int) $p))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$s}%")
                ->orWhereHas('hotel', fn ($h) => $h->where('name', 'like', "%{$s}%"))))
            ->when(
                ! empty($filters['check_in']) && ! empty($filters['check_out']),
                fn ($q) => $q->availableBetween($filters['check_in'], $filters['check_out'])
            );

        match ($filters['sort'] ?? 'price_asc') {
            'price_desc' => $query->orderByDesc('price_per_night'),
            'capacity' => $query->orderByDesc('capacity'),
            'newest' => $query->latest(),
            'recommended' => $query->orderByDesc(
                \App\Models\Hotel::select('rating')->whereColumn('hotels.id', 'rooms.hotel_id')
            ),
            default => $query->orderBy('price_per_night'),
        };

        return $query->paginate(min((int) ($filters['per_page'] ?? 12), 100))->withQueryString();
    }

    public function create(array $data): Room
    {
        return DB::transaction(function () use ($data) {
            $room = Room::create($data);
            $room->amenities()->sync($data['amenities'] ?? []);

            return $room->load(['hotel', 'amenities']);
        });
    }

    public function update(Room $room, array $data): Room
    {
        return DB::transaction(function () use ($room, $data) {
            $room->update($data);
            if (array_key_exists('amenities', $data)) {
                $room->amenities()->sync($data['amenities'] ?? []);
            }

            return $room->load(['hotel', 'amenities']);
        });
    }

    public function delete(Room $room): void
    {
        $room->delete();
    }
}
