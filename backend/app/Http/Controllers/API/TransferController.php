<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\TransferStoreRequest;
use App\Models\Transfer;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $transfers = Transfer::query()
            ->with(['sourceWarehouse', 'destinationWarehouse', 'creator'])
            ->withCount('items')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search): void {
                    $query->where('transfer_no', 'like', "%{$search}%")
                        ->orWhereHas('sourceWarehouse', fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"))
                        ->orWhereHas('destinationWarehouse', fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($transfers);
    }

    public function store(TransferStoreRequest $request, InventoryService $inventoryService): JsonResponse
    {
        $data = $request->validated();
        $transfer = $inventoryService->transferStock(
            Warehouse::findOrFail($data['source_warehouse_id']),
            Warehouse::findOrFail($data['dest_warehouse_id']),
            $data['items'],
            $request->user(),
            $data['transfer_no'] ?? null,
            $data['notes'] ?? null,
        );

        return response()->json([
            'success' => true,
            'message' => 'Transfer antar-gudang berhasil dibuat.',
            'data' => $transfer,
        ], 201);
    }

    public function show(Transfer $transfer): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Transfer detail retrieved.',
            'data' => $transfer->load(['sourceWarehouse', 'destinationWarehouse', 'creator', 'items.product']),
        ]);
    }

    public function approve(Transfer $transfer, InventoryService $inventoryService, Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Transfer berhasil di-approve.',
            'data' => $inventoryService->approveTransfer($transfer, $request->user()),
        ]);
    }

    public function receive(Transfer $transfer, InventoryService $inventoryService, Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Transfer berhasil diterima.',
            'data' => $inventoryService->receiveTransfer($transfer, $request->user()),
        ]);
    }

    public function transit(Transfer $transfer, InventoryService $inventoryService): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Transfer masuk status transit.',
            'data' => $inventoryService->markTransferInTransit($transfer),
        ]);
    }

    public function complete(Transfer $transfer, InventoryService $inventoryService): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Transfer berhasil diselesaikan.',
            'data' => $inventoryService->completeTransfer($transfer),
        ]);
    }

    public function reject(Transfer $transfer, InventoryService $inventoryService): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Transfer berhasil ditolak.',
            'data' => $inventoryService->rejectTransfer($transfer),
        ]);
    }
}
