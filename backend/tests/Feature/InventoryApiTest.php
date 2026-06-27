<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_inventory_and_low_stock_endpoints_return_current_stock(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $warehouse = Warehouse::factory()->create();
        $product = Product::factory()->create([
            'minimum_stock' => 10,
        ]);

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 7,
            'location_bin' => 'Aisle 1, Bin A1',
        ]);

        $this->getJson('/api/inventory')
            ->assertOk()
            ->assertJsonPath('data.0.product.id', $product->id)
            ->assertJsonPath('data.0.warehouse.id', $warehouse->id);

        $this->getJson('/api/inventory/low-stock')
            ->assertOk()
            ->assertJsonPath('data.0.product.id', $product->id);
    }

    public function test_stock_card_returns_product_movements_batches_and_current_stock(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $warehouse = Warehouse::factory()->create();
        $product = Product::factory()->create();

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 12,
        ]);

        StockBatch::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'batch_number' => 'BATCH-001',
            'initial_qty' => 12,
            'remaining_qty' => 12,
            'unit_cost' => 10000,
            'received_date' => now()->toDateString(),
        ]);

        StockMovement::create([
            'reference_no' => 'PO-100',
            'type' => 'IN',
            'product_id' => $product->id,
            'dest_warehouse_id' => $warehouse->id,
            'quantity' => 12,
            'unit_cost' => 10000,
            'user_id' => $user->id,
        ]);

        $this->getJson("/api/inventory/stock-card?product_id={$product->id}&warehouse_id={$warehouse->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.product.id', $product->id)
            ->assertJsonPath('data.warehouse.id', $warehouse->id)
            ->assertJsonPath('data.current_stock', 12)
            ->assertJsonPath('data.batches.0.batch_number', 'BATCH-001')
            ->assertJsonPath('data.movements.0.reference_no', 'PO-100');
    }
}
