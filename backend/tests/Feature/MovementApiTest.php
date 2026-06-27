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

class MovementApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_in_updates_inventory_average_cost_batch_and_ledger(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $product = Product::factory()->average()->create([
            'average_cost' => 0,
        ]);
        $warehouse = Warehouse::factory()->create();

        $this->postJson('/api/movements/in', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 20,
            'unit_cost' => 12500,
            'reference_no' => 'PO-001',
            'location_bin' => 'Aisle 1, Bin A1',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'IN');

        $this->assertSame(20, Inventory::where('product_id', $product->id)->where('warehouse_id', $warehouse->id)->value('quantity'));
        $this->assertSame('12500.00', $product->fresh()->average_cost);
        $this->assertSame(1, StockBatch::where('product_id', $product->id)->count());
        $this->assertDatabaseHas('stock_movements', [
            'reference_no' => 'PO-001',
            'type' => 'IN',
            'quantity' => 20,
        ]);
    }

    public function test_stock_out_uses_fifo_and_rejects_insufficient_stock(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $product = Product::factory()->fifo()->create();
        $warehouse = Warehouse::factory()->create();

        $this->postJson('/api/movements/in', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 10,
            'unit_cost' => 10000,
        ])->assertCreated();

        $this->postJson('/api/movements/out', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 4,
            'reference_no' => 'SO-001',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'OUT');

        $this->assertSame(6, Inventory::where('product_id', $product->id)->where('warehouse_id', $warehouse->id)->value('quantity'));
        $this->assertSame(6, StockBatch::where('product_id', $product->id)->where('warehouse_id', $warehouse->id)->value('remaining_qty'));
        $this->assertDatabaseHas('stock_movements', [
            'reference_no' => 'SO-001',
            'type' => 'OUT',
            'quantity' => 4,
        ]);

        $this->postJson('/api/movements/out', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 99,
        ])->assertUnprocessable();
    }

    public function test_v1_stock_in_and_stock_out_contract_routes_work(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $product = Product::factory()->average()->create([
            'average_cost' => 0,
        ]);
        $warehouse = Warehouse::factory()->create();

        $this->postJson('/api/v1/stock-in', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 8,
            'unit_cost' => 7500,
            'reference_no' => 'V1-IN-001',
        ])->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.type', 'IN');

        $this->postJson('/api/v1/stock-out', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 3,
            'reference_no' => 'V1-OUT-001',
        ])->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.type', 'OUT');

        $this->assertSame(5, Inventory::where('product_id', $product->id)->where('warehouse_id', $warehouse->id)->value('quantity'));
    }
}
