<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StockOpnameApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_opname_session_can_be_counted_and_approved(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $warehouse = Warehouse::factory()->create(['code' => 'WH-OPN']);
        $product = Product::factory()->average()->create([
            'average_cost' => 12000,
        ]);

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 10,
        ]);

        $opnameId = $this->postJson('/api/stock-opnames', [
            'warehouse_id' => $warehouse->id,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.items.0.system_qty', '10.00')
            ->json('data.id');

        $this->postJson("/api/stock-opnames/{$opnameId}/items", [
            'product_id' => $product->id,
            'physical_qty' => 7,
        ])->assertOk()
            ->assertJsonPath('data.difference_qty', '-3.00');

        $this->postJson("/api/stock-opnames/{$opnameId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'ADJUSTED')
            ->assertJsonPath('data.approved_by', $user->id);

        $this->assertSame(7, Inventory::where('product_id', $product->id)->where('warehouse_id', $warehouse->id)->value('quantity'));
        $this->assertSame(1, StockMovement::where('movement_type', 'OPNAME')->where('reference_no', 'like', 'OPN-%')->count());
        $this->assertSame(1, AuditLog::where('action', 'STOCK_OPNAME_APPROVE')->count());
    }

    public function test_stock_opname_can_create_positive_adjustment(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $warehouse = Warehouse::factory()->create(['code' => 'WH-PLUS']);
        $product = Product::factory()->average()->create([
            'average_cost' => 9000,
        ]);

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 4,
        ]);

        $opnameId = $this->postJson('/api/v1/stock-opnames', [
            'warehouse_id' => $warehouse->id,
        ])->assertCreated()
            ->json('data.id');

        $this->postJson("/api/v1/stock-opnames/{$opnameId}/items", [
            'product_id' => $product->id,
            'physical_qty' => 6,
        ])->assertOk()
            ->assertJsonPath('data.difference_qty', '2.00');

        $this->postJson("/api/v1/stock-opnames/{$opnameId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'ADJUSTED');

        $this->assertSame(6, Inventory::where('product_id', $product->id)->where('warehouse_id', $warehouse->id)->value('quantity'));
        $this->assertDatabaseHas('stock_movements', [
            'movement_type' => 'OPNAME',
            'type' => 'IN',
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
        ]);
    }
}
