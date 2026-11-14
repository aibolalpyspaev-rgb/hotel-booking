<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\UpdateBookingStatusRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BookingController extends Controller
{
    public function __construct(private readonly BookingService $bookings) {}

    /** GET /api/admin/bookings — все бронирования */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:'.implode(',', BookingStatus::values())],
            'hotel_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        return BookingResource::collection($this->bookings->listAll($filters));
    }

    /** PATCH /api/admin/bookings/{id}/status */
    public function updateStatus(UpdateBookingStatusRequest $request, Booking $booking): BookingResource
    {
        $booking = $this->bookings->changeStatus($booking, BookingStatus::from($request->validated('status')));

        return (new BookingResource($booking->load(['room.hotel', 'user'])))
            ->additional(['success' => true, 'message' => 'Статус бронирования изменён: '.$booking->status->label().'.']);
    }
}
