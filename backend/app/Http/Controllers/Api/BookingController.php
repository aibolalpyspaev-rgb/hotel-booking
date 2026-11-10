<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class BookingController extends Controller
{
    public function __construct(private readonly BookingService $bookings) {}

    /** GET /api/bookings — бронирования текущего пользователя */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:pending,confirmed,cancelled,completed'],
            'per_page' => ['nullable', 'integer', 'between:1,50'],
        ]);

        return BookingResource::collection($this->bookings->listForUser($request->user(), $filters));
    }

    /** GET /api/bookings/{id} */
    public function show(Booking $booking): BookingResource
    {
        Gate::authorize('view', $booking);

        return new BookingResource($booking->load(['room.hotel', 'room.amenities', 'user', 'review']));
    }

    /** POST /api/bookings */
    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->bookings->create($request->user(), $request->validated());

        return (new BookingResource($booking->load(['room.hotel', 'review'])))
            ->additional(['success' => true, 'message' => "Бронирование {$booking->code} создано. Подтвердите его, чтобы закрепить номер."])
            ->response()->setStatusCode(201);
    }

    /** PATCH /api/bookings/{id}/confirm — имитация оплаты/подтверждения */
    public function confirm(Booking $booking): BookingResource
    {
        Gate::authorize('confirm', $booking);

        return (new BookingResource($this->bookings->confirm($booking)->load(['room.hotel', 'review'])))
            ->additional(['success' => true, 'message' => "Бронирование {$booking->code} подтверждено!"]);
    }

    /** PATCH /api/bookings/{id}/cancel */
    public function cancel(Request $request, Booking $booking): BookingResource
    {
        Gate::authorize('cancel', $booking);

        return (new BookingResource($this->bookings->cancel($booking, $request->user())->load(['room.hotel', 'review'])))
            ->additional(['success' => true, 'message' => 'Бронирование отменено.']);
    }
}
