<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\StockCardRequest;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $inventories = Inventory::query()
            ->with(['product.category', 'warehouse'])
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('warehouse_id', $request->integer('warehouse_id')))
            ->when($request->filled('product_id'), fn ($query) => $query->where('product_id', $request->integer('product_id')))
            ->when($request->filled('stock_status'), function ($query) use ($request): void {
                $status = strtoupper($request->string('stock_status')->toString());

                if ($status === 'OUT_OF_STOCK') {
                    $query->where('inventories.quantity', '<=', 0);

                    return;
                }

                if (! in_array($status, ['LOW_STOCK', 'IN_STOCK'], true)) {
                    return;
                }

                $query
                    ->join('products as stock_filter_products', 'inventories.product_id', '=', 'stock_filter_products.id')
                    ->select('inventories.*');

                if ($status === 'LOW_STOCK') {
                    $query
                        ->where('inventories.quantity', '>', 0)
                        ->whereColumn('inventories.quantity', '<=', 'stock_filter_products.minimum_stock');

                    return;
                }

                $query->whereColumn('inventories.quantity', '>', 'stock_filter_products.minimum_stock');
            })
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();

                $query->whereHas('product', function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                    });
            })
            ->orderBy('inventories.warehouse_id')
            ->orderBy('inventories.product_id')
            ->paginate($request->integer('per_page', 20));

        return response()->json($inventories);
    }

    public function lowStock(Request $request): JsonResponse
    {
        $inventories = Inventory::query()
            ->with(['product.category', 'warehouse'])
            ->whereHas('product')
            ->whereColumn('quantity', '<=', 'products.minimum_stock')
            ->join('products', 'inventories.product_id', '=', 'products.id')
            ->select('inventories.*')
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('warehouse_id', $request->integer('warehouse_id')))
            ->orderBy('quantity')
            ->paginate($request->integer('per_page', 20));

        return response()->json($inventories);
    }

    public function stockCard(StockCardRequest $request): JsonResponse
    {
        $data = $request->validated();
        $product = Product::with(['category', 'unitRecord'])->findOrFail($data['product_id']);
        $warehouse = isset($data['warehouse_id'])
            ? Warehouse::findOrFail($data['warehouse_id'])
            : null;

        $currentStock = (float) Inventory::query()
            ->where('product_id', $product->id)
            ->when($warehouse, fn ($query) => $query->where('warehouse_id', $warehouse->id))
            ->sum('quantity');

        $movements = StockMovement::query()
            ->with(['sourceWarehouse', 'destinationWarehouse', 'warehouse', 'user'])
            ->where('product_id', $product->id)
            ->when($warehouse, function ($query) use ($warehouse): void {
                $query->where(function ($query) use ($warehouse): void {
                    $query->where('warehouse_id', $warehouse->id)
                        ->orWhere('source_warehouse_id', $warehouse->id)
                        ->orWhere('dest_warehouse_id', $warehouse->id);
                });
            })
            ->oldest()
            ->get();

        $runningBalance = 0.0;
        $movementRows = $movements->map(function (StockMovement $movement) use (&$runningBalance, $warehouse): array {
            $quantity = (float) $movement->quantity;
            $signedQuantity = match ($movement->type) {
                'IN' => $quantity,
                'OUT' => -$quantity,
                'TRANSFER' => $warehouse === null ? 0.0 : ((int) $movement->dest_warehouse_id === (int) $warehouse->id ? $quantity : -$quantity),
                default => $quantity,
            };
            $runningBalance += $signedQuantity;

            return [
                'id' => $movement->id,
                'reference_no' => $movement->reference_no,
                'type' => $movement->type,
                'movement_type' => $movement->movement_type,
                'quantity' => $quantity,
                'signed_quantity' => $signedQuantity,
                'balance_after' => $movement->balance_after === null ? $runningBalance : (float) $movement->balance_after,
                'unit_cost' => $movement->unit_cost === null ? null : (float) $movement->unit_cost,
                'source_warehouse' => $movement->sourceWarehouse,
                'destination_warehouse' => $movement->destinationWarehouse,
                'created_by' => $movement->user?->only(['id', 'name', 'email']),
                'created_at' => $movement->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Stock card retrieved.',
            'data' => [
                'product' => $product,
                'warehouse' => $warehouse,
                'current_stock' => $currentStock,
                'batches' => StockBatch::query()
                    ->where('product_id', $product->id)
                    ->when($warehouse, fn ($query) => $query->where('warehouse_id', $warehouse->id))
                    ->where('remaining_qty', '>', 0)
                    ->orderBy('received_date')
                    ->get(),
                'movements' => $movementRows,
            ],
        ]);
    }
}
