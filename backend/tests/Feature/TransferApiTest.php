<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_transfer_can_be_created_approved_and_received(): void
    {
        $this->actingAsRole();

        $source = Warehouse::factory()->create(['code' => 'WH-SRC']);
        $destination = Warehouse::factory()->create(['code' => 'WH-DST']);
        $product = Product::factory()->fifo()->create();

        $this->postJson('/api/v1/stock-in', [
            'product_id' => $product->id,
            'warehouse_id' => $source->id,
            'quantity' => 15,
            'unit_cost' => 15000,
        ])->assertCreated();

        $createResponse = $this->postJson('/api/v1/transfers', [
            'source_warehouse_id' => $source->id,
            'dest_warehouse_id' => $destination->id,
            'transfer_no' => 'TRF-001',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 5],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.transfer_no', 'TRF-001')
            ->assertJsonPath('data.status', 'DRAFT');

        $transferId = $createResponse->json('data.id');

        $this->assertSame(15, Inventory::where('product_id', $product->id)->where('warehouse_id', $source->id)->value('quantity'));
        $this->assertNull(Inventory::where('product_id', $product->id)->where('warehouse_id', $destination->id)->value('quantity'));

        $this->putJson("/api/v1/transfers/{$transferId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'APPROVED');

        $this->assertSame(10, Inventory::where('product_id', $product->id)->where('warehouse_id', $source->id)->value('quantity'));
        $this->assertNull(Inventory::where('product_id', $product->id)->where('warehouse_id', $destination->id)->value('quantity'));
        $this->assertSame(1, StockMovement::where('reference_no', 'TRF-001')->where('movement_type', 'TRANSFER_OUT')->count());

        $this->putJson("/api/v1/transfers/{$transferId}/receive")
            ->assertOk()
            ->assertJsonPath('data.status', 'RECEIVED');

        $this->assertSame(5, Inventory::where('product_id', $product->id)->where('warehouse_id', $destination->id)->value('quantity'));
        $this->assertSame(1, StockMovement::where('reference_no', 'TRF-001')->where('movement_type', 'TRANSFER_IN')->count());
    }

    public function test_transfer_can_be_rejected_before_approval(): void
    {
        $this->actingAsRole();

        $source = Warehouse::factory()->create(['code' => 'WH-SRC']);
        $destination = Warehouse::factory()->create(['code' => 'WH-DST']);
        $product = Product::factory()->fifo()->create();

        $this->postJson('/api/v1/stock-in', [
            'product_id' => $product->id,
            'warehouse_id' => $source->id,
            'quantity' => 8,
            'unit_cost' => 15000,
        ])->assertCreated();

        $transferId = $this->postJson('/api/v1/transfers', [
            'source_warehouse_id' => $source->id,
            'destination_warehouse_id' => $destination->id,
            'transfer_no' => 'TRF-REJECT',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 3],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.status', 'DRAFT')
            ->json('data.id');

        $this->putJson("/api/v1/transfers/{$transferId}/reject")
            ->assertOk()
            ->assertJsonPath('data.status', 'REJECTED');

        $this->assertSame(8, Inventory::where('product_id', $product->id)->where('warehouse_id', $source->id)->value('quantity'));
        $this->assertSame(0, StockMovement::where('reference_no', 'TRF-REJECT')->count());
    }
}
