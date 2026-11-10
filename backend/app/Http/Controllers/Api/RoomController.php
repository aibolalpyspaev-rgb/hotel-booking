<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Room\AvailabilityRequest;
use App\Http\Requests\Room\RoomIndexRequest;
use App\Http\Requests\Room\StoreRoomRequest;
use App\Http\Requests\Room\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use App\Services\BookingService;
use App\Services\RoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RoomController extends Controller
{
    public function __construct(
        private readonly RoomService $rooms,
        private readonly BookingService $bookings,
    ) {}

    /** GET /api/rooms */
    public function index(RoomIndexRequest $request): AnonymousResourceCollection
    {
        $includeInactive = $request->boolean('include_inactive') && $request->user('sanctum')?->isAdmin();

        return RoomResource::collection($this->rooms->search($request->validated(), (bool) $includeInactive));
    }

    /** GET /api/rooms/{id} */
    public function show(Request $request, Room $room): RoomResource
    {
        if ((! $room->is_active || ! $room->hotel->is_active) && ! $request->user('sanctum')?->isAdmin()) {
            abort(404);
        }

        $room->load(['hotel', 'amenities']);

        return (new RoomResource($room))->additional([
            'occupied' => $this->bookings->occupiedRanges($room),
        ]);
    }

    /** GET /api/rooms/{id}/availability?check_in=&check_out= — проверка занятости и расчёт стоимости */
    public function availability(AvailabilityRequest $request, Room $room): JsonResponse
    {
        $quote = $this->bookings->quote($room, $request->validated('check_in'), $request->validated('check_out'));

        return response()->json([
            'data' => $quote,
            'message' => $quote['available'] ? 'Номер свободен на выбранные даты.' : 'Номер занят на выбранные даты.',
        ]);
    }

    /** POST /api/rooms (admin) */
    public function store(StoreRoomRequest $request): JsonResponse
    {
        return (new RoomResource($this->rooms->create($request->validated())))
            ->additional(['success' => true, 'message' => 'Номер добавлен.'])
            ->response()->setStatusCode(201);
    }

    /** PUT /api/rooms/{id} (admin) */
    public function update(UpdateRoomRequest $request, Room $room): RoomResource
    {
        return (new RoomResource($this->rooms->update($room, $request->validated())))
            ->additional(['success' => true, 'message' => 'Номер обновлён.']);
    }

    /** DELETE /api/rooms/{id} (admin) */
    public function destroy(Room $room): JsonResponse
    {
        $this->rooms->delete($room);

        return response()->json(['success' => true, 'message' => 'Номер удалён.']);
    }
}
