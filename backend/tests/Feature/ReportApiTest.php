<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_report_returns_filtered_inventory_rows_and_summary(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $warehouse = Warehouse::factory()->create(['code' => 'WH-RPT']);
        $product = Product::factory()->create([
            'sku' => 'SKU-RPT-001',
            'name' => 'Report Product',
            'minimum_stock' => 12,
            'average_cost' => 25000,
        ]);

        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 8,
        ]);

        $this->getJson("/api/v1/reports/stocks?warehouse_id={$warehouse->id}&search=Report")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.items.0.sku', 'SKU-RPT-001')
            ->assertJsonPath('data.items.0.status', 'LOW_STOCK')
            ->assertJsonPath('data.summary.total_rows', 1)
            ->assertJsonPath('data.summary.total_quantity', 8);
    }

    public function test_movement_report_returns_filtered_movement_rows(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $warehouse = Warehouse::factory()->create();
        $product = Product::factory()->create(['sku' => 'SKU-MOV-001']);

        StockMovement::create([
            'reference_no' => 'MOV-RPT-001',
            'movement_type' => 'STOCK_IN',
            'type' => 'IN',
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'dest_warehouse_id' => $warehouse->id,
            'quantity' => 15,
            'unit_cost' => 10000,
            'created_by' => $user->id,
            'user_id' => $user->id,
        ]);

        $this->getJson("/api/v1/reports/movements?warehouse_id={$warehouse->id}&movement_type=STOCK_IN")
            ->assertOk()
            ->assertJsonPath('data.items.0.reference_no', 'MOV-RPT-001')
            ->assertJsonPath('data.items.0.movement_type', 'STOCK_IN')
            ->assertJsonPath('data.summary.total_in', 15);
    }

    public function test_transfer_and_opname_reports_return_operational_rows(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $source = Warehouse::factory()->create(['code' => 'WH-SRC']);
        $destination = Warehouse::factory()->create(['code' => 'WH-DST']);
        $product = Product::factory()->create(['sku' => 'SKU-TRF-001']);

        $transfer = Transfer::create([
            'transfer_no' => 'TRF-RPT-001',
            'source_warehouse_id' => $source->id,
            'destination_warehouse_id' => $destination->id,
            'dest_warehouse_id' => $destination->id,
            'created_by' => $user->id,
            'status' => 'RECEIVED',
        ]);
        TransferItem::create([
            'transfer_id' => $transfer->id,
            'product_id' => $product->id,
            'quantity' => 5,
        ]);

        $opname = StockOpname::create([
            'opname_no' => 'OPN-RPT-001',
            'warehouse_id' => $source->id,
            'status' => 'ADJUSTED',
            'performed_by' => $user->id,
            'approved_by' => $user->id,
        ]);
        StockOpnameItem::create([
            'stock_opname_id' => $opname->id,
            'product_id' => $product->id,
            'system_qty' => 10,
            'physical_qty' => 8,
            'difference_qty' => -2,
        ]);

        $this->getJson('/api/v1/reports/transfers?status=RECEIVED')
            ->assertOk()
            ->assertJsonPath('data.items.0.transfer_no', 'TRF-RPT-001')
            ->assertJsonPath('data.items.0.total_quantity', 5)
            ->assertJsonPath('data.summary.received_count', 1);

        $this->getJson('/api/v1/reports/opnames?status=ADJUSTED')
            ->assertOk()
            ->assertJsonPath('data.items.0.opname_no', 'OPN-RPT-001')
            ->assertJsonPath('data.items.0.difference_items', 1)
            ->assertJsonPath('data.summary.adjusted_count', 1);
    }
}
