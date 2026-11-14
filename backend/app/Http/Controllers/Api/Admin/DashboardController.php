<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Services\StatisticsService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /** GET /api/admin/stats */
    public function __invoke(StatisticsService $stats): JsonResponse
    {
        $data = $stats->dashboard();
        $data['recent_bookings'] = BookingResource::collection($data['recent_bookings']);

        return response()->json(['data' => $data]);
    }
}
