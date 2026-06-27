<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\StockInRequest;
use App\Http\Requests\API\StockOutRequest;
use App\Models\StockMovement;
use App\Services\StockInService;
use App\Services\StockOutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MovementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $movements = StockMovement::query()
            ->with(['product', 'sourceWarehouse', 'destinationWarehouse', 'user'])
            ->when($request->filled('type'), fn ($query) => $query->where('type', strtoupper($request->string('type')->toString())))
            ->when($request->filled('product_id'), fn ($query) => $query->where('product_id', $request->integer('product_id')))
            ->when($request->filled('warehouse_id'), function ($query) use ($request): void {
                $warehouseId = $request->integer('warehouse_id');

                $query->where(function ($query) use ($warehouseId): void {
                    $query->where('source_warehouse_id', $warehouseId)
                        ->orWhere('dest_warehouse_id', $warehouseId);
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($movements);
    }

    public function storeIn(StockInRequest $request, StockInService $stockInService): JsonResponse
    {
        $data = $request->validated();
        $movement = $stockInService->handle($data, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Barang masuk berhasil dicatat.',
            'data' => $movement->load(['product', 'destinationWarehouse', 'user']),
        ], 201);
    }

    public function storeOut(StockOutRequest $request, StockOutService $stockOutService): JsonResponse
    {
        $data = $request->validated();
        $movement = $stockOutService->handle($data, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Barang keluar berhasil dicatat.',
            'data' => $movement->load(['product', 'sourceWarehouse', 'user']),
        ], 201);
    }
}
