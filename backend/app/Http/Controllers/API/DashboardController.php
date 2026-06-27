<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function summary(Request $request, DashboardService $dashboardService): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Dashboard summary retrieved.',
            'data' => $dashboardService->summary($request->integer('warehouse_id') ?: null),
        ]);
    }
}
