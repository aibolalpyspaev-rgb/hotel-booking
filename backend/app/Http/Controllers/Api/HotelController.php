<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Hotel\HotelIndexRequest;
use App\Http\Requests\Hotel\StoreHotelRequest;
use App\Http\Requests\Hotel\UpdateHotelRequest;
use App\Http\Resources\HotelResource;
use App\Models\Hotel;
use App\Services\HotelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HotelController extends Controller
{
    public function __construct(private readonly HotelService $hotels) {}

    /** GET /api/hotels — поиск, фильтры, сортировка, пагинация */
    public function index(HotelIndexRequest $request): AnonymousResourceCollection
    {
        $includeInactive = $request->boolean('include_inactive') && $request->user('sanctum')?->isAdmin();

        return HotelResource::collection($this->hotels->search($request->validated(), (bool) $includeInactive));
    }

    /** GET /api/hotels/{id} */
    public function show(Request $request, Hotel $hotel): HotelResource
    {
        if (! $hotel->is_active && ! $request->user('sanctum')?->isAdmin()) {
            abort(404);
        }

        $filters = $request->validate([
            'check_in' => ['nullable', 'date', 'after_or_equal:today', 'required_with:check_out'],
            'check_out' => ['nullable', 'date', 'after:check_in', 'required_with:check_in'],
        ]);

        $hotel = $this->hotels->loadDetails($hotel, $filters);
        $hotel->hotel_amenities = $this->hotels->hotelAmenities($hotel);

        return new HotelResource($hotel);
    }

    /** POST /api/hotels (admin) */
    public function store(StoreHotelRequest $request): JsonResponse
    {
        $hotel = $this->hotels->create($request->validated());

        return (new HotelResource($hotel))
            ->additional(['success' => true, 'message' => 'Отель добавлен.'])
            ->response()->setStatusCode(201);
    }

    /** PUT /api/hotels/{id} (admin) */
    public function update(UpdateHotelRequest $request, Hotel $hotel): HotelResource
    {
        return (new HotelResource($this->hotels->update($hotel, $request->validated())))
            ->additional(['success' => true, 'message' => 'Отель обновлён.']);
    }

    /** DELETE /api/hotels/{id} (admin) */
    public function destroy(Hotel $hotel): JsonResponse
    {
        $this->hotels->delete($hotel);

        return response()->json(['success' => true, 'message' => 'Отель удалён.']);
    }

    /** GET /api/cities */
    public function cities(): JsonResponse
    {
        return response()->json(['data' => $this->hotels->cities()]);
    }
}
