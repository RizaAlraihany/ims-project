<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function stocks(Request $request, ReportService $reportService): JsonResponse
    {
        return $this->reportResponse('Stock report retrieved.', $reportService->stocks($request));
    }

    public function movements(Request $request, ReportService $reportService): JsonResponse
    {
        return $this->reportResponse('Movement report retrieved.', $reportService->movements($request));
    }

    public function transfers(Request $request, ReportService $reportService): JsonResponse
    {
        return $this->reportResponse('Transfer report retrieved.', $reportService->transfers($request));
    }

    public function opnames(Request $request, ReportService $reportService): JsonResponse
    {
        return $this->reportResponse('Opname report retrieved.', $reportService->opnames($request));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function reportResponse(string $message, array $data): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ]);
    }
}
