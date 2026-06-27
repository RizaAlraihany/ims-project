<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Transfer;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(?int $warehouseId = null): array
    {
        $todayRange = [now()->startOfDay(), now()->endOfDay()];
        $pendingStatuses = ['Pending', 'Transit', 'DRAFT', 'APPROVED', 'IN_TRANSIT', 'RECEIVED'];

        $lowStockQuery = Inventory::query()
            ->with(['product.category', 'warehouse'])
            ->join('products', 'inventories.product_id', '=', 'products.id')
            ->whereColumn('inventories.quantity', '<=', 'products.minimum_stock')
            ->when($warehouseId, fn ($query) => $query->where('inventories.warehouse_id', $warehouseId))
            ->select('inventories.*');

        $inventoryQuery = Inventory::query()
            ->when($warehouseId, fn ($query) => $query->where('warehouse_id', $warehouseId));

        $movementQuery = StockMovement::query()
            ->when($warehouseId, function ($query) use ($warehouseId): void {
                $query->where(function ($query) use ($warehouseId): void {
                    $query->where('warehouse_id', $warehouseId)
                        ->orWhere('source_warehouse_id', $warehouseId)
                        ->orWhere('dest_warehouse_id', $warehouseId);
                });
            });

        $transferQuery = Transfer::query()
            ->when($warehouseId, function ($query) use ($warehouseId): void {
                $query->where(function ($query) use ($warehouseId): void {
                    $query->where('source_warehouse_id', $warehouseId)
                        ->orWhere('dest_warehouse_id', $warehouseId)
                        ->orWhere('destination_warehouse_id', $warehouseId);
                });
            });

        return [
            'metrics' => [
                'total_sku' => $warehouseId
                    ? (clone $inventoryQuery)->distinct()->count('product_id')
                    : Product::query()->where('status', true)->count(),
                'total_stock' => (float) (clone $inventoryQuery)->sum('quantity'),
                'total_warehouses' => $warehouseId ? 1 : Warehouse::query()->where('status', true)->count(),
                'inventory_value' => $this->inventoryValue($warehouseId),
                'stock_in_today' => (float) (clone $movementQuery)
                    ->where('type', 'IN')
                    ->whereBetween('created_at', $todayRange)
                    ->sum('quantity'),
                'stock_out_today' => (float) (clone $movementQuery)
                    ->where('type', 'OUT')
                    ->whereBetween('created_at', $todayRange)
                    ->sum('quantity'),
                'low_stock_count' => (clone $lowStockQuery)->count(),
                'pending_transfers' => (clone $transferQuery)->whereIn('status', $pendingStatuses)->count(),
            ],
            'low_stocks' => (clone $lowStockQuery)
                ->orderByRaw('CAST(products.minimum_stock AS SIGNED) - CAST(inventories.quantity AS SIGNED) DESC')
                ->limit(6)
                ->get()
                ->map(fn (Inventory $inventory): array => [
                    'id' => $inventory->id,
                    'quantity' => (float) $inventory->quantity,
                    'minimum_stock' => (float) $inventory->product->minimum_stock,
                    'status' => ((float) $inventory->quantity) <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
                    'product' => [
                        'id' => $inventory->product->id,
                        'sku' => $inventory->product->sku,
                        'name' => $inventory->product->name,
                    ],
                    'warehouse' => [
                        'id' => $inventory->warehouse->id,
                        'code' => $inventory->warehouse->code,
                        'name' => $inventory->warehouse->name,
                    ],
                ])
                ->values(),
            'pending_transfers' => (clone $transferQuery)
                ->with(['sourceWarehouse', 'destinationWarehouse', 'creator'])
                ->withCount('items')
                ->whereIn('status', $pendingStatuses)
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (Transfer $transfer): array => [
                    'id' => $transfer->id,
                    'transfer_no' => $transfer->transfer_no,
                    'status' => $transfer->status,
                    'items_count' => $transfer->items_count,
                    'source_warehouse' => [
                        'id' => $transfer->sourceWarehouse->id,
                        'code' => $transfer->sourceWarehouse->code,
                        'name' => $transfer->sourceWarehouse->name,
                    ],
                    'destination_warehouse' => [
                        'id' => $transfer->destinationWarehouse->id,
                        'code' => $transfer->destinationWarehouse->code,
                        'name' => $transfer->destinationWarehouse->name,
                    ],
                    'created_at' => $transfer->created_at,
                ])
                ->values(),
            'inventory_snapshot' => (clone $inventoryQuery)
                ->with(['product', 'warehouse'])
                ->latest()
                ->limit(4)
                ->get()
                ->map(fn (Inventory $inventory): array => [
                    'id' => $inventory->id,
                    'quantity' => (float) $inventory->quantity,
                    'location_bin' => $inventory->location_bin,
                    'product' => [
                        'id' => $inventory->product->id,
                        'sku' => $inventory->product->sku,
                        'name' => $inventory->product->name,
                    ],
                    'warehouse' => [
                        'id' => $inventory->warehouse->id,
                        'code' => $inventory->warehouse->code,
                        'name' => $inventory->warehouse->name,
                    ],
                ])
                ->values(),
            'recent_activities' => (clone $movementQuery)
                ->with(['product', 'sourceWarehouse', 'destinationWarehouse', 'warehouse', 'user'])
                ->latest()
                ->limit(6)
                ->get()
                ->map(fn (StockMovement $movement): array => [
                    'id' => $movement->id,
                    'reference_no' => $movement->reference_no,
                    'type' => $movement->type,
                    'movement_type' => $movement->movement_type,
                    'quantity' => (float) $movement->quantity,
                    'unit_cost' => $movement->unit_cost === null ? null : (float) $movement->unit_cost,
                    'product' => [
                        'id' => $movement->product->id,
                        'sku' => $movement->product->sku,
                        'name' => $movement->product->name,
                    ],
                    'source_warehouse' => $movement->sourceWarehouse ? [
                        'id' => $movement->sourceWarehouse->id,
                        'code' => $movement->sourceWarehouse->code,
                        'name' => $movement->sourceWarehouse->name,
                    ] : null,
                    'destination_warehouse' => $movement->destinationWarehouse ? [
                        'id' => $movement->destinationWarehouse->id,
                        'code' => $movement->destinationWarehouse->code,
                        'name' => $movement->destinationWarehouse->name,
                    ] : null,
                    'created_by' => $movement->user ? [
                        'id' => $movement->user->id,
                        'name' => $movement->user->name,
                    ] : null,
                    'created_at' => $movement->created_at,
                ])
                ->values(),
        ];
    }

    private function inventoryValue(?int $warehouseId = null): float
    {
        return (float) Inventory::query()
            ->join('products', 'inventories.product_id', '=', 'products.id')
            ->when($warehouseId, fn ($query) => $query->where('inventories.warehouse_id', $warehouseId))
            ->selectRaw('COALESCE(SUM(inventories.quantity * products.average_cost), 0) as inventory_value')
            ->value('inventory_value');
    }
}
