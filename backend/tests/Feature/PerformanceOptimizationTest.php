<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PerformanceOptimizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_phase_fourteen_performance_indexes_exist(): void
    {
        foreach ([
            'inventories' => ['inventories_warehouse_qty_product_index'],
            'stock_movements' => [
                'stock_movements_type_created_index',
                'stock_movements_movement_created_index',
                'stock_movements_warehouse_created_index',
                'stock_movements_ref_product_type_index',
            ],
            'transfers' => [
                'transfers_status_created_index',
                'transfers_source_status_created_index',
                'transfers_dest_status_created_index',
            ],
            'stock_opnames' => ['stock_opnames_warehouse_status_created_index'],
            'notifications' => [
                'notifications_user_read_created_index',
                'notifications_read_created_index',
            ],
        ] as $table => $indexes) {
            foreach ($indexes as $index) {
                $this->assertContains($index, $this->indexNames($table), "{$table}.{$index} index is missing.");
            }
        }
    }

    public function test_report_transfer_and_opname_rows_do_not_lazy_load_items_per_row(): void
    {
        $user = User::factory()->create();
        $source = Warehouse::factory()->create();
        $destination = Warehouse::factory()->create();
        $products = Product::factory()->count(2)->create();

        for ($i = 1; $i <= 6; $i++) {
            $transfer = Transfer::create([
                'transfer_no' => "TRF-PERF-{$i}",
                'source_warehouse_id' => $source->id,
                'destination_warehouse_id' => $destination->id,
                'dest_warehouse_id' => $destination->id,
                'created_by' => $user->id,
                'status' => 'RECEIVED',
            ]);

            foreach ($products as $product) {
                TransferItem::create([
                    'transfer_id' => $transfer->id,
                    'product_id' => $product->id,
                    'quantity' => $i,
                ]);
            }

            $opname = StockOpname::create([
                'opname_no' => "OPN-PERF-{$i}",
                'warehouse_id' => $source->id,
                'status' => 'ADJUSTED',
                'performed_by' => $user->id,
                'approved_by' => $user->id,
            ]);

            foreach ($products as $product) {
                StockOpnameItem::create([
                    'stock_opname_id' => $opname->id,
                    'product_id' => $product->id,
                    'system_qty' => 10,
                    'physical_qty' => 8,
                    'difference_qty' => -2,
                ]);
            }
        }

        $service = app(ReportService::class);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $transferReport = $service->transfers(Request::create('/reports/transfers', 'GET', [
            'per_page' => 20,
            'status' => 'RECEIVED',
        ]));
        $transferQueryCount = count(DB::getQueryLog());

        DB::flushQueryLog();

        $opnameReport = $service->opnames(Request::create('/reports/opnames', 'GET', [
            'per_page' => 20,
            'status' => 'ADJUSTED',
        ]));
        $opnameQueryCount = count(DB::getQueryLog());

        DB::disableQueryLog();

        $this->assertCount(6, $transferReport['items']);
        $this->assertSame(12.0, $transferReport['items'][0]['total_quantity']);
        $this->assertLessThanOrEqual(10, $transferQueryCount);

        $this->assertCount(6, $opnameReport['items']);
        $this->assertSame(2, $opnameReport['items'][0]['difference_items']);
        $this->assertLessThanOrEqual(9, $opnameQueryCount);
    }

    /**
     * @return array<int, string>
     */
    private function indexNames(string $table): array
    {
        if (DB::getDriverName() === 'sqlite') {
            return array_map(
                static fn (object $index): string => $index->name,
                DB::select("PRAGMA index_list('{$table}')"),
            );
        }

        return array_map(
            static fn (object $index): string => $index->Key_name,
            DB::select("SHOW INDEXES FROM {$table}"),
        );
    }
}
