<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Transfer;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_summary_returns_operational_metrics(): void
    {
        $user = $this->actingAsRole();

        $sourceWarehouse = Warehouse::factory()->create(['code' => 'WH-A']);
        $destinationWarehouse = Warehouse::factory()->create(['code' => 'WH-B']);
        $product = Product::factory()->create([
            'minimum_stock' => 10,
            'average_cost' => 2500,
        ]);

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $sourceWarehouse->id,
            'quantity' => 7,
        ]);

        StockMovement::create([
            'reference_no' => 'PO-901',
            'type' => 'IN',
            'product_id' => $product->id,
            'dest_warehouse_id' => $sourceWarehouse->id,
            'quantity' => 7,
            'unit_cost' => 2500,
            'user_id' => $user->id,
        ]);

        Transfer::create([
            'transfer_no' => 'TRF-PENDING',
            'source_warehouse_id' => $sourceWarehouse->id,
            'dest_warehouse_id' => $destinationWarehouse->id,
            'created_by' => $user->id,
            'status' => 'Pending',
        ]);

        $this->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.metrics.total_sku', 1)
            ->assertJsonPath('data.metrics.total_stock', 7)
            ->assertJsonPath('data.metrics.total_warehouses', 2)
            ->assertJsonPath('data.metrics.inventory_value', 17500)
            ->assertJsonPath('data.metrics.low_stock_count', 1)
            ->assertJsonPath('data.metrics.pending_transfers', 1)
            ->assertJsonPath('data.low_stocks.0.product.sku', $product->sku)
            ->assertJsonPath('data.recent_activities.0.reference_no', 'PO-901');
    }

    public function test_v1_dashboard_summary_route_is_available(): void
    {
        $this->actingAsRole();

        $this->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'metrics' => [
                        'total_sku',
                        'total_stock',
                        'total_warehouses',
                        'inventory_value',
                        'stock_in_today',
                        'stock_out_today',
                        'low_stock_count',
                        'pending_transfers',
                    ],
                    'low_stocks',
                    'pending_transfers',
                    'recent_activities',
                ],
            ]);
    }

    public function test_dashboard_low_stock_orders_largest_deficit_first(): void
    {
        $this->actingAsRole();

        $warehouse = Warehouse::factory()->create();
        $criticalProduct = Product::factory()->create([
            'minimum_stock' => 20,
        ]);
        $warningProduct = Product::factory()->create([
            'minimum_stock' => 10,
        ]);

        Inventory::create([
            'product_id' => $warningProduct->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 7,
        ]);
        Inventory::create([
            'product_id' => $criticalProduct->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 0,
        ]);

        $this->getJson('/api/v1/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.low_stocks.0.product.sku', $criticalProduct->sku)
            ->assertJsonPath('data.low_stocks.1.product.sku', $warningProduct->sku);
    }
}
