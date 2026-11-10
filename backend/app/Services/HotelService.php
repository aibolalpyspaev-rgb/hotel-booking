<?php

namespace App\Services;

use App\Models\Amenity;
use App\Models\Hotel;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Поиск, фильтрация, сортировка отелей и управление ими.
 */
class HotelService
{
    public const SORTS = ['popular', 'price_asc', 'price_desc', 'rating', 'stars', 'newest', 'name'];

    public function search(array $filters, bool $includeInactive = false): LengthAwarePaginator
    {
        return $this->buildQuery($filters, $includeInactive)
            ->paginate(min((int) ($filters['per_page'] ?? 9), 50))
            ->withQueryString();
    }

    /** Используется AI-помощником: те же фильтры, без пагинации. */
    public function find(array $filters, int $limit = 5): Collection
    {
        return $this->buildQuery($filters)->limit($limit)->get();
    }

    public function buildQuery(array $filters, bool $includeInactive = false): Builder
    {
        $roomConstraint = $this->roomConstraint($filters);
        $hasRoomFilters = collect(['guests', 'min_price', 'max_price', 'amenities', 'check_in'])
            ->contains(fn ($key) => ! empty($filters[$key]));

        $query = Hotel::query()
            ->when(! $includeInactive, fn (Builder $q) => $q->active())
            ->withMin(['rooms as min_price' => $roomConstraint], 'price_per_night')
            ->withCount([
                'rooms as available_rooms_count' => $roomConstraint,
                'reviews',
            ]);

        if ($hasRoomFilters) {
            $query->whereHas('rooms', $roomConstraint);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['city'])) {
            $query->where('city', $filters['city']);
        }

        if (! empty($filters['stars'])) {
            $stars = array_map('intval', (array) $filters['stars']);
            $query->whereIn('stars', $stars);
        }

        if (! empty($filters['min_rating'])) {
            $query->where('rating', '>=', (float) $filters['min_rating']);
        }

        match ($filters['sort'] ?? 'popular') {
            'price_asc' => $query->orderByRaw('min_price IS NULL, min_price ASC'),
            'price_desc' => $query->orderByDesc('min_price'),
            'rating' => $query->orderByDesc('rating'),
            'stars' => $query->orderByDesc('stars')->orderByDesc('rating'),
            'newest' => $query->latest(),
            'name' => $query->orderBy('name'),
            default => $query->orderByDesc('reviews_count')->orderByDesc('rating'),
        };

        return $query;
    }

    /** Ограничения на номера: вместимость, цена, удобства, свободные даты. */
    public function roomConstraint(array $filters): \Closure
    {
        return function ($q) use ($filters) {
            $q->where('is_active', true);

            if (! empty($filters['guests'])) {
                $q->where('capacity', '>=', (int) $filters['guests']);
            }
            if (! empty($filters['min_price'])) {
                $q->where('price_per_night', '>=', (int) $filters['min_price']);
            }
            if (! empty($filters['max_price'])) {
                $q->where('price_per_night', '<=', (int) $filters['max_price']);
            }
            foreach ((array) ($filters['amenities'] ?? []) as $amenityId) {
                $q->whereHas('amenities', fn ($a) => $a->where('amenities.id', (int) $amenityId));
            }
            if (! empty($filters['check_in']) && ! empty($filters['check_out'])) {
                $q->availableBetween($filters['check_in'], $filters['check_out']);
            }
        };
    }

    public function loadDetails(Hotel $hotel, array $filters = []): Hotel
    {
        $roomConstraint = $this->roomConstraint(array_intersect_key($filters, array_flip(['check_in', 'check_out'])));

        $hotel->load([
            'rooms' => fn ($q) => $q->where('is_active', true)->with('amenities')->orderBy('price_per_night'),
            'reviews' => fn ($q) => $q->with('user:id,name')->latest()->limit(20),
        ])->loadCount('reviews')->loadMin('rooms as min_price', 'price_per_night');

        // Если указаны даты — помечаем каждый номер свободен/занят
        if (! empty($filters['check_in']) && ! empty($filters['check_out'])) {
            $freeQuery = $hotel->rooms()->getQuery();
            $roomConstraint($freeQuery);
            $freeIds = $freeQuery->pluck('id')->all();
            $hotel->rooms->each(fn ($room) => $room->setAttribute('is_available', in_array($room->id, $freeIds, true)));
        }

        return $hotel;
    }

    public function create(array $data): Hotel
    {
        return Hotel::create($data);
    }

    public function update(Hotel $hotel, array $data): Hotel
    {
        $hotel->update($data);

        return $hotel;
    }

    public function delete(Hotel $hotel): void
    {
        $hotel->delete();
    }

    /** Список городов с количеством отелей и минимальной ценой. */
    public function cities(): Collection
    {
        return Hotel::query()->active()
            ->select('hotels.city', DB::raw('COUNT(DISTINCT hotels.id) as hotels_count'), DB::raw('MIN(rooms.price_per_night) as min_price'))
            ->leftJoin('rooms', fn ($j) => $j->on('rooms.hotel_id', '=', 'hotels.id')->where('rooms.is_active', true))
            ->groupBy('hotels.city')
            ->orderBy('hotels.city')
            ->get();
    }

    /** Все удобства, доступные в номерах отеля. */
    public function hotelAmenities(Hotel $hotel): Collection
    {
        return Amenity::query()
            ->whereHas('rooms', fn ($q) => $q->where('hotel_id', $hotel->id))
            ->orderBy('name')
            ->get();
    }
}
