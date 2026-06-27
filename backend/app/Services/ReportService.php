<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\StockOpname;
use App\Models\Transfer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ReportService
{
    /**
     * @return array<string, mixed>
     */
    public function stocks(Request $request): array
    {
        $query = Inventory::query()
            ->with(['product.category', 'product.unitRecord', 'warehouse'])
            ->when($request->filled('warehouse_id'), fn (Builder $query) => $query->where('warehouse_id', $request->integer('warehouse_id')))
            ->when($request->filled('category_id'), fn (Builder $query) => $query->whereHas('product', fn (Builder $query) => $query->where('category_id', $request->integer('category_id'))))
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $search = $request->string('search')->toString();

                $query->whereHas('product', function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            });

        $summaryQuery = clone $query;
        $paginator = $query
            ->orderBy('warehouse_id')
            ->orderBy('product_id')
            ->paginate($request->integer('per_page', 20));

        return [
            'items' => $paginator->through(fn (Inventory $inventory): array => $this->stockRow($inventory))->items(),
            'pagination' => $this->pagination($paginator),
            'summary' => [
                'total_rows' => (clone $summaryQuery)->count(),
                'total_quantity' => (float) (clone $summaryQuery)->sum('quantity'),
                'total_value' => $this->stockValue(clone $summaryQuery),
                'low_stock_count' => (clone $summaryQuery)
                    ->join('products', 'inventories.product_id', '=', 'products.id')
                    ->whereColumn('inventories.quantity', '<=', 'products.minimum_stock')
                    ->count(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function movements(Request $request): array
    {
        $query = StockMovement::query()
            ->with(['product', 'warehouse', 'sourceWarehouse', 'destinationWarehouse', 'user'])
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->whereHas('product', function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('category_id'), fn (Builder $query) => $query->whereHas('product', fn (Builder $query) => $query->where('category_id', $request->integer('category_id'))))
            ->when($request->filled('movement_type'), fn (Builder $query) => $query->where('movement_type', $request->string('movement_type')->toString()))
            ->when($request->filled('warehouse_id'), function (Builder $query) use ($request): void {
                $warehouseId = $request->integer('warehouse_id');

                $query->where(function (Builder $query) use ($warehouseId): void {
                    $query->where('warehouse_id', $warehouseId)
                        ->orWhere('source_warehouse_id', $warehouseId)
                        ->orWhere('dest_warehouse_id', $warehouseId);
                });
            })
            ->when($request->filled('date_from'), fn (Builder $query) => $query->whereDate('created_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn (Builder $query) => $query->whereDate('created_at', '<=', $request->date('date_to')));

        $summaryQuery = clone $query;
        $paginator = $query->latest()->paginate($request->integer('per_page', 20));

        return [
            'items' => $paginator->through(fn (StockMovement $movement): array => $this->movementRow($movement))->items(),
            'pagination' => $this->pagination($paginator),
            'summary' => [
                'total_rows' => (clone $summaryQuery)->count(),
                'total_in' => (float) (clone $summaryQuery)->where('type', 'IN')->sum('quantity'),
                'total_out' => (float) (clone $summaryQuery)->where('type', 'OUT')->sum('quantity'),
                'total_transfer_rows' => (clone $summaryQuery)->where('type', 'TRANSFER')->count(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function transfers(Request $request): array
    {
        $query = Transfer::query()
            ->with(['sourceWarehouse', 'destinationWarehouse', 'creator'])
            ->withCount('items')
            ->withSum('items as total_quantity', 'quantity')
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->where(function (Builder $q) use ($search) {
                    $q->where('transfer_no', 'like', "%{$search}%")
                      ->orWhereHas('items.product', function (Builder $q) use ($search) {
                          $q->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%")
                            ->orWhere('barcode', 'like', "%{$search}%");
                      });
                });
            })
            ->when($request->filled('category_id'), fn (Builder $query) => $query->whereHas('items.product', fn (Builder $query) => $query->where('category_id', $request->integer('category_id'))))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('warehouse_id'), function (Builder $query) use ($request): void {
                $warehouseId = $request->integer('warehouse_id');

                $query->where(function (Builder $query) use ($warehouseId): void {
                    $query->where('source_warehouse_id', $warehouseId)
                        ->orWhere('dest_warehouse_id', $warehouseId);
                });
            })
            ->when($request->filled('date_from'), fn (Builder $query) => $query->whereDate('created_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn (Builder $query) => $query->whereDate('created_at', '<=', $request->date('date_to')));

        $summaryQuery = clone $query;
        $paginator = $query->latest()->paginate($request->integer('per_page', 20));

        return [
            'items' => $paginator->through(fn (Transfer $transfer): array => $this->transferRow($transfer))->items(),
            'pagination' => $this->pagination($paginator),
            'summary' => [
                'total_rows' => (clone $summaryQuery)->count(),
                'draft_count' => (clone $summaryQuery)->whereIn('status', ['DRAFT', 'Pending'])->count(),
                'approved_count' => (clone $summaryQuery)->whereIn('status', ['APPROVED', 'IN_TRANSIT', 'Transit'])->count(),
                'received_count' => (clone $summaryQuery)->whereIn('status', ['RECEIVED', 'Completed'])->count(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function opnames(Request $request): array
    {
        $query = StockOpname::query()
            ->with(['warehouse', 'performer', 'approver'])
            ->withCount([
                'items',
                'items as difference_items_count' => fn (Builder $query) => $query->where('difference_qty', '!=', 0),
            ])
            ->withSum('items as total_difference', 'difference_qty')
            ->when($request->filled('search'), function (Builder $query) use ($request): void {
                $search = $request->string('search')->toString();
                $query->where(function (Builder $q) use ($search) {
                    $q->where('opname_no', 'like', "%{$search}%")
                      ->orWhereHas('items.product', function (Builder $q) use ($search) {
                          $q->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%")
                            ->orWhere('barcode', 'like', "%{$search}%");
                      });
                });
            })
            ->when($request->filled('category_id'), fn (Builder $query) => $query->whereHas('items.product', fn (Builder $query) => $query->where('category_id', $request->integer('category_id'))))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('warehouse_id'), fn (Builder $query) => $query->where('warehouse_id', $request->integer('warehouse_id')))
            ->when($request->filled('date_from'), fn (Builder $query) => $query->whereDate('created_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn (Builder $query) => $query->whereDate('created_at', '<=', $request->date('date_to')));

        $summaryQuery = clone $query;
        $paginator = $query->latest()->paginate($request->integer('per_page', 20));

        return [
            'items' => $paginator->through(fn (StockOpname $opname): array => $this->opnameRow($opname))->items(),
            'pagination' => $this->pagination($paginator),
            'summary' => [
                'total_rows' => (clone $summaryQuery)->count(),
                'counting_count' => (clone $summaryQuery)->whereIn('status', ['DRAFT', 'COUNTING', 'REVIEW'])->count(),
                'adjusted_count' => (clone $summaryQuery)->whereIn('status', ['APPROVED', 'ADJUSTED'])->count(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function stockRow(Inventory $inventory): array
    {
        $quantity = (float) $inventory->quantity;
        $minimumStock = (float) $inventory->product->minimum_stock;

        return [
            'id' => $inventory->id,
            'sku' => $inventory->product->sku,
            'product' => $inventory->product->name,
            'warehouse' => $inventory->warehouse->name,
            'warehouse_code' => $inventory->warehouse->code,
            'category' => $inventory->product->category?->name,
            'unit' => $inventory->product->unitRecord?->symbol ?? $inventory->product->unit,
            'quantity' => $quantity,
            'minimum_stock' => $minimumStock,
            'inventory_value' => $quantity * (float) $inventory->product->average_cost,
            'status' => $quantity <= 0 ? 'OUT_OF_STOCK' : ($quantity <= $minimumStock ? 'LOW_STOCK' : 'NORMAL'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function movementRow(StockMovement $movement): array
    {
        return [
            'id' => $movement->id,
            'reference_no' => $movement->reference_no,
            'movement_type' => $movement->movement_type,
            'type' => $movement->type,
            'sku' => $movement->product->sku,
            'product' => $movement->product->name,
            'warehouse' => $movement->warehouse?->name,
            'source_warehouse' => $movement->sourceWarehouse?->name,
            'destination_warehouse' => $movement->destinationWarehouse?->name,
            'quantity' => (float) $movement->quantity,
            'unit_cost' => $movement->unit_cost === null ? null : (float) $movement->unit_cost,
            'total_cost' => $movement->unit_cost === null ? null : (float) $movement->quantity * (float) $movement->unit_cost,
            'created_by' => $movement->user?->name,
            'created_at' => $movement->created_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transferRow(Transfer $transfer): array
    {
        return [
            'id' => $transfer->id,
            'transfer_no' => $transfer->transfer_no,
            'source_warehouse' => $transfer->sourceWarehouse?->name,
            'destination_warehouse' => $transfer->destinationWarehouse?->name,
            'status' => $transfer->status,
            'items_count' => $transfer->items_count,
            'total_quantity' => (float) ($transfer->total_quantity ?? 0),
            'created_by' => $transfer->creator?->name,
            'created_at' => $transfer->created_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function opnameRow(StockOpname $opname): array
    {
        return [
            'id' => $opname->id,
            'opname_no' => $opname->opname_no,
            'warehouse' => $opname->warehouse?->name,
            'status' => $opname->status,
            'items_count' => $opname->items_count,
            'difference_items' => (int) ($opname->difference_items_count ?? 0),
            'total_difference' => (float) ($opname->total_difference ?? 0),
            'performed_by' => $opname->performer?->name,
            'approved_by' => $opname->approver?->name,
            'created_at' => $opname->created_at,
        ];
    }

    private function stockValue(Builder $query): float
    {
        return (float) (clone $query)
            ->join('products', 'inventories.product_id', '=', 'products.id')
            ->selectRaw('COALESCE(SUM(inventories.quantity * products.average_cost), 0) as inventory_value')
            ->value('inventory_value');
    }

    /**
     * @return array<string, int>
     */
    private function pagination(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
        ];
    }
}
