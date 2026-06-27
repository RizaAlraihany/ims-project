<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Transfer;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function __construct(private readonly NotificationService $notificationService)
    {
    }

    /**
     * @param  array{reference_no?: string|null, location_bin?: string|null, received_date?: string|null}  $options
     */
    public function receiveStock(Product $product, Warehouse $warehouse, int $quantity, float $unitCost, User $user, array $options = []): StockMovement
    {
        return DB::transaction(function () use ($options, $product, $quantity, $unitCost, $user, $warehouse): StockMovement {
            $totalStockBefore = (int) Inventory::where('product_id', $product->id)->sum('quantity');

            $inventory = $this->inventoryRow($product, $warehouse, $options['location_bin'] ?? null);
            $inventory->quantity += $quantity;
            $inventory->save();

            StockBatch::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'batch_number' => $this->batchNumber($product, $warehouse),
                'initial_qty' => $quantity,
                'remaining_qty' => $quantity,
                'unit_cost' => $unitCost,
                'received_date' => $options['received_date'] ?? now()->toDateString(),
            ]);

            if ($product->valuation_method === 'average') {
                $product->average_cost = $this->averageCost($product, $totalStockBefore, $quantity, $unitCost);
                $product->save();
            }

            $this->notifyLowStockIfNeeded($product, $warehouse);

            return StockMovement::create([
                'reference_no' => $options['reference_no'] ?? null,
                'type' => 'IN',
                'product_id' => $product->id,
                'source_warehouse_id' => null,
                'dest_warehouse_id' => $warehouse->id,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'user_id' => $user->id,
            ]);
        });
    }

    /**
     * @param  array{reference_no?: string|null, location_bin?: string|null}  $options
     */
    public function issueStock(Product $product, Warehouse $warehouse, int $quantity, User $user, array $options = []): StockMovement
    {
        return DB::transaction(function () use ($options, $product, $quantity, $user, $warehouse): StockMovement {
            $consumedBatches = $this->deductStock($product, $warehouse, $quantity, $options['location_bin'] ?? null);
            $this->notifyLowStockIfNeeded($product, $warehouse);

            return StockMovement::create([
                'reference_no' => $options['reference_no'] ?? null,
                'type' => 'OUT',
                'product_id' => $product->id,
                'source_warehouse_id' => $warehouse->id,
                'dest_warehouse_id' => null,
                'quantity' => $quantity,
                'unit_cost' => $this->movementCost($product, $consumedBatches, $quantity),
                'user_id' => $user->id,
            ]);
        });
    }

    /**
     * @param  array<int, array{product_id: int, quantity: int}>  $items
     */
    public function transferStock(Warehouse $sourceWarehouse, Warehouse $destinationWarehouse, array $items, User $user, ?string $referenceNo = null, ?string $notes = null): Transfer
    {
        return DB::transaction(function () use ($destinationWarehouse, $items, $notes, $referenceNo, $sourceWarehouse, $user): Transfer {
            if ($sourceWarehouse->is($destinationWarehouse)) {
                throw ValidationException::withMessages([
                    'dest_warehouse_id' => ['Gudang tujuan harus berbeda dari gudang asal.'],
                ]);
            }

            $transfer = Transfer::create([
                'transfer_no' => $referenceNo ?: $this->transferNumber(),
                'source_warehouse_id' => $sourceWarehouse->id,
                'destination_warehouse_id' => $destinationWarehouse->id,
                'dest_warehouse_id' => $destinationWarehouse->id,
                'created_by' => $user->id,
                'status' => 'DRAFT',
                'notes' => $notes,
            ]);

            foreach ($items as $item) {
                $transfer->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => (int) $item['quantity'],
                ]);
            }

            $transfer = $transfer->load(['items.product', 'sourceWarehouse', 'destinationWarehouse', 'creator']);
            $this->notificationService->transferCreated($transfer);

            return $transfer;
        });
    }

    public function approveTransfer(Transfer $transfer, User $user): Transfer
    {
        return DB::transaction(function () use ($transfer, $user): Transfer {
            $transfer = Transfer::query()
                ->with(['items.product', 'sourceWarehouse', 'destinationWarehouse'])
                ->lockForUpdate()
                ->findOrFail($transfer->id);

            if (!in_array($transfer->status, ['DRAFT', 'Pending'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Transfer hanya dapat di-approve dari status DRAFT.'],
                ]);
            }

            foreach ($transfer->items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item->product_id);
                $quantity = (int) $item->quantity;
                $consumedBatches = $this->deductStock($product, $transfer->sourceWarehouse, $quantity);

                StockMovement::create([
                    'reference_no' => $transfer->transfer_no,
                    'movement_type' => 'TRANSFER_OUT',
                    'type' => 'TRANSFER',
                    'product_id' => $product->id,
                    'warehouse_id' => $transfer->source_warehouse_id,
                    'source_warehouse_id' => $transfer->source_warehouse_id,
                    'dest_warehouse_id' => $transfer->dest_warehouse_id,
                    'quantity' => $quantity,
                    'unit_cost' => $this->movementCost($product, $consumedBatches, $quantity),
                    'user_id' => $user->id,
                    'created_by' => $user->id,
                ]);

                $this->notifyLowStockIfNeeded($product, $transfer->sourceWarehouse);
            }

            $transfer->forceFill([
                'status' => 'APPROVED',
                'approved_by' => $user->id,
                'in_transit_at' => null,
                'received_at' => null,
                'completed_at' => null,
                'rejected_at' => null,
            ])->save();

            $transfer = $transfer->load(['items.product', 'sourceWarehouse', 'destinationWarehouse', 'creator']);
            $this->notificationService->transferStatus($transfer, 'approved');

            return $transfer;
        });
    }

    public function markTransferInTransit(Transfer $transfer): Transfer
    {
        return DB::transaction(function () use ($transfer): Transfer {
            $transfer = Transfer::query()
                ->with(['items.product', 'sourceWarehouse', 'destinationWarehouse', 'creator'])
                ->lockForUpdate()
                ->findOrFail($transfer->id);

            if ($transfer->status !== 'APPROVED') {
                throw ValidationException::withMessages([
                    'status' => ['Transfer hanya dapat masuk transit dari status APPROVED.'],
                ]);
            }

            $transfer->forceFill([
                'status' => 'IN_TRANSIT',
                'in_transit_at' => now(),
            ])->save();

            $this->notificationService->transferStatus($transfer, 'in transit');

            return $transfer->load(['items.product', 'sourceWarehouse', 'destinationWarehouse', 'creator']);
        });
    }

    public function receiveTransfer(Transfer $transfer, User $user): Transfer
    {
        return DB::transaction(function () use ($transfer, $user): Transfer {
            $transfer = Transfer::query()
                ->with(['items.product', 'sourceWarehouse', 'destinationWarehouse'])
                ->lockForUpdate()
                ->findOrFail($transfer->id);

            if (! in_array($transfer->status, ['APPROVED', 'IN_TRANSIT'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Transfer hanya dapat diterima dari status APPROVED atau IN_TRANSIT.'],
                ]);
            }

            foreach ($transfer->items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item->product_id);
                $quantity = (int) $item->quantity;
                $outMovement = StockMovement::query()
                    ->where('reference_no', $transfer->transfer_no)
                    ->where('product_id', $product->id)
                    ->where('movement_type', 'TRANSFER_OUT')
                    ->latest()
                    ->first();
                $unitCost = $outMovement?->unit_cost === null
                    ? (float) $product->average_cost
                    : (float) $outMovement->unit_cost;

                $destinationInventory = $this->inventoryRow($product, $transfer->destinationWarehouse);
                $destinationInventory->quantity += $quantity;
                $destinationInventory->save();

                $this->createDestinationBatches($product, $transfer->destinationWarehouse, $quantity, collect(), $unitCost);

                StockMovement::create([
                    'reference_no' => $transfer->transfer_no,
                    'movement_type' => 'TRANSFER_IN',
                    'type' => 'TRANSFER',
                    'product_id' => $product->id,
                    'warehouse_id' => $transfer->dest_warehouse_id,
                    'source_warehouse_id' => $transfer->source_warehouse_id,
                    'dest_warehouse_id' => $transfer->dest_warehouse_id,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'user_id' => $user->id,
                    'created_by' => $user->id,
                ]);

                $this->notifyLowStockIfNeeded($product, $transfer->destinationWarehouse);
            }

            $transfer->forceFill([
                'status' => 'RECEIVED',
                'received_by' => $user->id,
                'received_at' => now(),
            ])->save();

            $transfer = $transfer->load(['items.product', 'sourceWarehouse', 'destinationWarehouse', 'creator']);
            $this->notificationService->transferStatus($transfer, 'received');

            return $transfer;
        });
    }

    public function completeTransfer(Transfer $transfer): Transfer
    {
        return DB::transaction(function () use ($transfer): Transfer {
            $transfer = Transfer::query()
                ->with(['items.product', 'sourceWarehouse', 'destinationWarehouse', 'creator'])
                ->lockForUpdate()
                ->findOrFail($transfer->id);

            if (! in_array($transfer->status, ['RECEIVED', 'Completed'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Transfer hanya dapat diselesaikan dari status RECEIVED.'],
                ]);
            }

            $transfer->forceFill([
                'status' => 'COMPLETED',
                'completed_at' => now(),
            ])->save();

            $this->notificationService->transferStatus($transfer, 'completed');

            return $transfer->load(['items.product', 'sourceWarehouse', 'destinationWarehouse', 'creator']);
        });
    }

    public function rejectTransfer(Transfer $transfer): Transfer
    {
        return DB::transaction(function () use ($transfer): Transfer {
            $transfer = Transfer::query()
                ->with(['items.product', 'sourceWarehouse', 'destinationWarehouse'])
                ->lockForUpdate()
                ->findOrFail($transfer->id);

            if (!in_array($transfer->status, ['DRAFT', 'Pending'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Transfer yang sudah approved/received tidak dapat di-reject.'],
                ]);
            }

            $transfer->forceFill([
                'status' => 'REJECTED',
                'rejected_at' => now(),
            ])->save();

            $transfer = $transfer->load(['items.product', 'sourceWarehouse', 'destinationWarehouse', 'creator']);
            $this->notificationService->transferStatus($transfer, 'rejected');

            return $transfer;
        });
    }

    public function adjustStockFromOpname(Product $product, Warehouse $warehouse, int $difference, string $referenceNo, User $user): ?StockMovement
    {
        if ($difference === 0) {
            return null;
        }

        $quantity = abs($difference);

        return DB::transaction(function () use ($difference, $product, $quantity, $referenceNo, $user, $warehouse): StockMovement {
            $type = $difference > 0 ? 'IN' : 'OUT';
            $unitCost = (float) $product->average_cost;

            if ($difference > 0) {
                $inventory = $this->inventoryRow($product, $warehouse);
                $inventory->quantity += $quantity;
                $inventory->save();

                $this->createDestinationBatches($product, $warehouse, $quantity, collect(), $unitCost);
            } else {
                $this->deductStock($product, $warehouse, $quantity);
            }

            $balanceAfter = (float) Inventory::query()
                ->where('product_id', $product->id)
                ->where('warehouse_id', $warehouse->id)
                ->sum('quantity');
            $this->notifyLowStockIfNeeded($product, $warehouse);

            return StockMovement::create([
                'reference_no' => $referenceNo,
                'movement_type' => 'OPNAME',
                'type' => $type,
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'source_warehouse_id' => $type === 'OUT' ? $warehouse->id : null,
                'dest_warehouse_id' => $type === 'IN' ? $warehouse->id : null,
                'quantity' => $quantity,
                'balance_after' => $balanceAfter,
                'unit_cost' => $unitCost,
                'notes' => 'Stock opname adjustment',
                'created_by' => $user->id,
                'user_id' => $user->id,
            ]);
        });
    }

    private function inventoryRow(Product $product, Warehouse $warehouse, ?string $locationBin = null): Inventory
    {
        return Inventory::firstOrNew([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'location_bin' => $locationBin,
        ], [
            'quantity' => 0,
        ]);
    }

    private function averageCost(Product $product, int $totalStockBefore, int $quantity, float $unitCost): float
    {
        $totalQuantity = $totalStockBefore + $quantity;

        if ($totalQuantity <= 0) {
            return $unitCost;
        }

        return (((float) $product->average_cost * $totalStockBefore) + ($unitCost * $quantity)) / $totalQuantity;
    }

    /**
     * @return Collection<int, array{quantity: int, unit_cost: float}>
     */
    private function deductStock(Product $product, Warehouse $warehouse, int $quantity, ?string $locationBin = null): Collection
    {
        $available = (int) Inventory::where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->when($locationBin !== null, fn ($query) => $query->where('location_bin', $locationBin))
            ->sum('quantity');

        if ($available < $quantity) {
            throw ValidationException::withMessages([
                'quantity' => ["Stok {$product->name} di {$warehouse->name} tidak mencukupi. Tersedia {$available}, diminta {$quantity}."],
            ]);
        }

        $remaining = $quantity;

        Inventory::where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->when($locationBin !== null, fn ($query) => $query->where('location_bin', $locationBin))
            ->where('quantity', '>', 0)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->each(function (Inventory $inventory) use (&$remaining): void {
                if ($remaining <= 0) {
                    return;
                }

                $deducted = min($inventory->quantity, $remaining);
                $inventory->quantity -= $deducted;
                $inventory->save();
                $remaining -= $deducted;
            });

        if ($product->valuation_method !== 'fifo') {
            return collect();
        }

        return $this->consumeFifoBatches($product, $warehouse, $quantity);
    }

    /**
     * @return Collection<int, array{quantity: int, unit_cost: float}>
     */
    private function consumeFifoBatches(Product $product, Warehouse $warehouse, int $quantity): Collection
    {
        $remaining = $quantity;
        $consumed = collect();

        StockBatch::where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->where('remaining_qty', '>', 0)
            ->orderBy('received_date')
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->each(function (StockBatch $batch) use (&$remaining, $consumed): void {
                if ($remaining <= 0) {
                    return;
                }

                $deducted = min($batch->remaining_qty, $remaining);
                $batch->remaining_qty -= $deducted;
                $batch->save();
                $remaining -= $deducted;

                $consumed->push([
                    'quantity' => $deducted,
                    'unit_cost' => (float) $batch->unit_cost,
                ]);
            });

        if ($remaining > 0) {
            throw ValidationException::withMessages([
                'quantity' => ["Batch FIFO {$product->name} tidak mencukupi."],
            ]);
        }

        return $consumed;
    }

    /**
     * @param  Collection<int, array{quantity: int, unit_cost: float}>  $consumedBatches
     */
    private function movementCost(Product $product, Collection $consumedBatches, int $quantity): float
    {
        if ($consumedBatches->isEmpty()) {
            return (float) $product->average_cost;
        }

        return $consumedBatches->sum(fn (array $batch) => $batch['quantity'] * $batch['unit_cost']) / $quantity;
    }

    /**
     * @param  Collection<int, array{quantity: int, unit_cost: float}>  $consumedBatches
     */
    private function createDestinationBatches(Product $product, Warehouse $warehouse, int $quantity, Collection $consumedBatches, float $fallbackUnitCost): void
    {
        $batches = $consumedBatches->isEmpty()
            ? collect([['quantity' => $quantity, 'unit_cost' => $fallbackUnitCost]])
            : $consumedBatches;

        $batches->each(function (array $batch) use ($product, $warehouse): void {
            StockBatch::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'batch_number' => $this->batchNumber($product, $warehouse, 'TRF'),
                'initial_qty' => $batch['quantity'],
                'remaining_qty' => $batch['quantity'],
                'unit_cost' => $batch['unit_cost'],
                'received_date' => now()->toDateString(),
            ]);
        });
    }

    private function batchNumber(Product $product, Warehouse $warehouse, string $prefix = 'BATCH'): string
    {
        return sprintf('%s-%s-%s-%s', $prefix, $warehouse->code, $product->sku, now()->format('YmdHisv'));
    }

    private function transferNumber(): string
    {
        return 'TRF-'.now()->format('YmdHisv');
    }

    private function notifyLowStockIfNeeded(Product $product, Warehouse $warehouse): void
    {
        $quantity = (float) Inventory::query()
            ->where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->sum('quantity');

        $this->notificationService->lowStock($product, $warehouse, $quantity);
    }
}
