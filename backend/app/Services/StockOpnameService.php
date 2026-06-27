<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockOpnameService
{
    public function __construct(
        private readonly InventoryService $inventoryService,
        private readonly AuditService $auditService,
        private readonly NotificationService $notificationService,
    )
    {
    }

    public function createSession(Warehouse $warehouse, User $user, ?string $ipAddress = null): StockOpname
    {
        return DB::transaction(function () use ($ipAddress, $user, $warehouse): StockOpname {
            $opname = StockOpname::create([
                'opname_no' => $this->opnameNumber(),
                'warehouse_id' => $warehouse->id,
                'status' => 'DRAFT',
                'performed_by' => $user->id,
            ]);

            Inventory::query()
                ->where('warehouse_id', $warehouse->id)
                ->where('quantity', '>=', 0)
                ->orderBy('product_id')
                ->get()
                ->each(function (Inventory $inventory) use ($opname): void {
                    $opname->items()->create([
                        'product_id' => $inventory->product_id,
                        'system_qty' => (int) $inventory->quantity,
                        'physical_qty' => (int) $inventory->quantity,
                        'difference_qty' => 0,
                    ]);
                });

            $this->auditService->log($user, 'STOCK_OPNAME_CREATE', $opname->getTable(), $opname->id, null, $opname->only(['id', 'opname_no', 'warehouse_id', 'status']), $ipAddress);
            $this->notificationService->opnameCreated($opname->load('warehouse'));

            return $this->loadSession($opname);
        });
    }

    public function saveItem(StockOpname $opname, Product $product, int $physicalQty, User $user, ?string $ipAddress = null): StockOpnameItem
    {
        return DB::transaction(function () use ($ipAddress, $opname, $physicalQty, $product, $user): StockOpnameItem {
            $opname = StockOpname::query()->lockForUpdate()->findOrFail($opname->id);

            if (in_array($opname->status, ['APPROVED', 'ADJUSTED'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Stock opname yang sudah di-approve tidak dapat diubah.'],
                ]);
            }

            $systemQty = $this->currentSystemQty($product, $opname->warehouse_id);
            $item = StockOpnameItem::query()
                ->where('stock_opname_id', $opname->id)
                ->where('product_id', $product->id)
                ->first();
            $oldValues = $item?->only(['system_qty', 'physical_qty', 'difference_qty']);

            $item = StockOpnameItem::updateOrCreate(
                [
                    'stock_opname_id' => $opname->id,
                    'product_id' => $product->id,
                ],
                [
                    'system_qty' => $systemQty,
                    'physical_qty' => $physicalQty,
                    'difference_qty' => $physicalQty - $systemQty,
                ],
            );

            $opname->forceFill(['status' => 'COUNTING'])->save();
            $this->auditService->log($user, 'STOCK_OPNAME_SAVE_ITEM', $item->getTable(), $item->id, $oldValues, $item->only(['id', 'stock_opname_id', 'product_id', 'system_qty', 'physical_qty', 'difference_qty']), $ipAddress);
            $this->notificationService->opnameSaved($opname->load('warehouse'), $product, (float) $item->difference_qty);

            return $item->load('product');
        });
    }

    public function approve(StockOpname $opname, User $user, ?string $ipAddress = null): StockOpname
    {
        return DB::transaction(function () use ($ipAddress, $opname, $user): StockOpname {
            $opname = StockOpname::query()
                ->with(['warehouse', 'items.product'])
                ->lockForUpdate()
                ->findOrFail($opname->id);

            if (in_array($opname->status, ['APPROVED', 'ADJUSTED'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Stock opname sudah diproses.'],
                ]);
            }

            if ($opname->items->isEmpty()) {
                throw ValidationException::withMessages([
                    'items' => ['Stock opname belum memiliki item untuk di-approve.'],
                ]);
            }

            foreach ($opname->items as $item) {
                $difference = (int) $item->difference_qty;

                if ($difference === 0) {
                    continue;
                }

                $this->inventoryService->adjustStockFromOpname(
                    $item->product,
                    $opname->warehouse,
                    $difference,
                    $opname->opname_no,
                    $user,
                );
            }

            $oldStatus = $opname->status;
            $opname->forceFill([
                'status' => 'ADJUSTED',
                'approved_by' => $user->id,
            ])->save();

            $this->auditService->log($user, 'STOCK_OPNAME_APPROVE', $opname->getTable(), $opname->id, ['status' => $oldStatus], $opname->only(['id', 'opname_no', 'status', 'approved_by']), $ipAddress);
            $this->notificationService->opnameApproved($opname->load('warehouse'));

            return $this->loadSession($opname);
        });
    }

    private function loadSession(StockOpname $opname): StockOpname
    {
        return $opname->load(['warehouse', 'performer', 'approver', 'items.product.category', 'items.product.unitRecord']);
    }

    private function currentSystemQty(Product $product, int $warehouseId): int
    {
        return (int) Inventory::query()
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouseId)
            ->sum('quantity');
    }

    private function opnameNumber(): string
    {
        return 'OPN-'.now()->format('YmdHisv');
    }

}
