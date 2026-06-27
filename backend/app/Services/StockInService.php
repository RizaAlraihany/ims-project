<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;

class StockInService
{
    public function __construct(private readonly InventoryService $inventoryService)
    {
    }

    /**
     * @param  array{product_id: int, warehouse_id: int, quantity: int, unit_cost: numeric, reference_no?: string|null, location_bin?: string|null, received_date?: string|null}  $data
     */
    public function handle(array $data, User $user): StockMovement
    {
        return $this->inventoryService->receiveStock(
            Product::findOrFail($data['product_id']),
            Warehouse::findOrFail($data['warehouse_id']),
            (int) $data['quantity'],
            (float) $data['unit_cost'],
            $user,
            [
                'reference_no' => $data['reference_no'] ?? null,
                'location_bin' => $data['location_bin'] ?? null,
                'received_date' => $data['received_date'] ?? null,
            ],
        );
    }
}
