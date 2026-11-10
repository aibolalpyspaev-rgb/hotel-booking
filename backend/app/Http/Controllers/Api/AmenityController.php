<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Amenity\AmenityRequest;
use App\Http\Resources\AmenityResource;
use App\Models\Amenity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AmenityController extends Controller
{
    /** GET /api/amenities */
    public function index(): AnonymousResourceCollection
    {
        return AmenityResource::collection(Amenity::withCount('rooms')->orderBy('name')->get());
    }

    /** POST /api/amenities (admin) */
    public function store(AmenityRequest $request): JsonResponse
    {
        $amenity = Amenity::create($request->validated() + ['icon' => 'check']);

        return (new AmenityResource($amenity))
            ->additional(['success' => true, 'message' => 'Удобство добавлено.'])
            ->response()->setStatusCode(201);
    }

    /** PUT /api/amenities/{id} (admin) */
    public function update(AmenityRequest $request, Amenity $amenity): AmenityResource
    {
        $amenity->update(array_filter($request->validated(), fn ($v) => $v !== null));

        return (new AmenityResource($amenity))->additional(['success' => true, 'message' => 'Удобство обновлено.']);
    }

    /** DELETE /api/amenities/{id} (admin) */
    public function destroy(Amenity $amenity): JsonResponse
    {
        $amenity->delete();

        return response()->json(['success' => true, 'message' => 'Удобство удалено.']);
    }
}
