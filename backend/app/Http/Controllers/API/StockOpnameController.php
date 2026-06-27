<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\StockOpnameItemRequest;
use App\Http\Requests\API\StockOpnameStoreRequest;
use App\Models\Product;
use App\Models\StockOpname;
use App\Models\Warehouse;
use App\Services\StockOpnameService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockOpnameController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $opnames = StockOpname::query()
            ->with(['warehouse', 'performer', 'approver'])
            ->withCount('items')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('warehouse_id', $request->integer('warehouse_id')))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search): void {
                    $query->where('opname_no', 'like', "%{$search}%")
                        ->orWhereHas('warehouse', fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($opnames);
    }

    public function store(StockOpnameStoreRequest $request, StockOpnameService $stockOpnameService): JsonResponse
    {
        $data = $request->validated();
        $opname = $stockOpnameService->createSession(
            Warehouse::findOrFail($data['warehouse_id']),
            $request->user(),
            $request->ip(),
        );

        return response()->json([
            'success' => true,
            'message' => 'Session stock opname berhasil dibuat.',
            'data' => $opname,
        ], 201);
    }

    public function show(StockOpname $stockOpname): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Stock opname detail retrieved.',
            'data' => $stockOpname->load(['warehouse', 'performer', 'approver', 'items.product.category', 'items.product.unitRecord']),
        ]);
    }

    public function saveItem(StockOpnameItemRequest $request, StockOpname $stockOpname, StockOpnameService $stockOpnameService): JsonResponse
    {
        $data = $request->validated();
        $item = $stockOpnameService->saveItem(
            $stockOpname,
            Product::findOrFail($data['product_id']),
            (int) $data['physical_qty'],
            $request->user(),
            $request->ip(),
        );

        return response()->json([
            'success' => true,
            'message' => 'Item stock opname berhasil disimpan.',
            'data' => $item,
        ]);
    }

    public function approve(Request $request, StockOpname $stockOpname, StockOpnameService $stockOpnameService): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Stock opname berhasil di-approve dan disesuaikan.',
            'data' => $stockOpnameService->approve($stockOpname, $request->user(), $request->ip()),
        ]);
    }
}
