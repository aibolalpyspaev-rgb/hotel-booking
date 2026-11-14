<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Review;
use App\Models\Room;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StatisticsService
{
    public function __construct(private readonly BookingService $bookings) {}

    public function dashboard(): array
    {
        $this->bookings->completeFinished();

        $byStatus = Booking::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $paid = [BookingStatus::Confirmed->value, BookingStatus::Completed->value];

        // Бронирования и выручка по месяцам (последние 6 месяцев)
        $months = collect(range(5, 0))->map(function (int $ago) use ($paid) {
            $start = now()->startOfMonth()->subMonths($ago);
            $end = $start->copy()->endOfMonth();
            $q = Booking::query()->whereBetween('created_at', [$start, $end]);

            return [
                'month' => $start->translatedFormat('M Y'),
                'bookings' => (clone $q)->count(),
                'revenue' => (int) (clone $q)->whereIn('status', $paid)->sum('total_price'),
            ];
        })->values();

        $topHotels = Hotel::query()
            ->select('hotels.id', 'hotels.name', 'hotels.city', 'hotels.rating')
            ->selectRaw('COUNT(bookings.id) as bookings_count')
            ->selectRaw('COALESCE(SUM(CASE WHEN bookings.status IN (?, ?) THEN bookings.total_price ELSE 0 END), 0) as revenue', $paid)
            ->leftJoin('rooms', 'rooms.hotel_id', '=', 'hotels.id')
            ->leftJoin('bookings', 'bookings.room_id', '=', 'rooms.id')
            ->groupBy('hotels.id', 'hotels.name', 'hotels.city', 'hotels.rating')
            ->orderByDesc('bookings_count')
            ->limit(5)
            ->get();

        $today = today()->toDateString();

        return [
            'totals' => [
                'hotels' => Hotel::count(),
                'rooms' => Room::count(),
                'bookings' => Booking::count(),
                'users' => User::where('role', UserRole::User)->count(),
                'reviews' => Review::count(),
                'active_bookings' => Booking::whereIn('status', BookingStatus::blocking())->count(),
                'guests_now' => Booking::where('status', BookingStatus::Confirmed)
                    ->where('check_in', '<=', $today)->where('check_out', '>', $today)->count(),
                'revenue' => (int) Booking::whereIn('status', $paid)->sum('total_price'),
                'average_rating' => round((float) Review::avg('rating'), 2),
            ],
            'by_status' => collect(BookingStatus::cases())->map(fn ($s) => [
                'status' => $s->value,
                'label' => $s->label(),
                'total' => (int) ($byStatus[$s->value] ?? 0),
            ])->values(),
            'by_month' => $months,
            'top_hotels' => $topHotels,
            'recent_bookings' => Booking::with(['room.hotel:id,name', 'user'])->latest()->limit(6)->get(),
        ];
    }

    /** Публичные цифры для главной страницы. */
    public function publicSummary(): array
    {
        return [
            'hotels' => Hotel::active()->count(),
            'rooms' => Room::active()->count(),
            'cities' => Hotel::active()->distinct('city')->count('city'),
            'reviews' => Review::count(),
            'average_rating' => round((float) Review::avg('rating'), 1),
        ];
    }
}
