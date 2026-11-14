<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StatisticsService;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    /** GET /api/stats — публичные цифры для главной страницы */
    public function __invoke(StatisticsService $stats): JsonResponse
    {
        return response()->json(['data' => $stats->publicSummary()]);
    }
}
