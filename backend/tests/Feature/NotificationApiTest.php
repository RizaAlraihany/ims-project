<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Product;
use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_low_stock_notification_is_generated_and_can_be_marked_read(): void
    {
        $user = $this->actingAsRole();

        $warehouse = Warehouse::factory()->create(['code' => 'WH-LOW']);
        $product = Product::factory()->create([
            'sku' => 'SKU-LOW-001',
            'name' => 'Low Stock Item',
            'minimum_stock' => 10,
        ]);
        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 4,
        ]);

        $notificationId = $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.unread_count', 1)
            ->assertJsonPath('data.items.0.title', 'Low Stock Alert: SKU-LOW-001')
            ->json('data.items.0.id');

        $this->putJson("/api/v1/notifications/{$notificationId}/read")
            ->assertOk()
            ->assertJsonPath('data.is_read', true);

        $this->assertTrue(Notification::find($notificationId)->is_read);
    }

    public function test_transfer_workflow_creates_notifications(): void
    {
        $this->actingAsRole();

        $source = Warehouse::factory()->create(['code' => 'WH-SRC']);
        $destination = Warehouse::factory()->create(['code' => 'WH-DST']);
        $product = Product::factory()->fifo()->create(['minimum_stock' => 1]);

        $this->postJson('/api/v1/stock-in', [
            'product_id' => $product->id,
            'warehouse_id' => $source->id,
            'quantity' => 12,
            'unit_cost' => 10000,
        ])->assertCreated();

        $transferId = $this->postJson('/api/v1/transfers', [
            'source_warehouse_id' => $source->id,
            'destination_warehouse_id' => $destination->id,
            'transfer_no' => 'TRF-NOTIF-001',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 5],
            ],
        ])->assertCreated()
            ->json('data.id');

        $this->putJson("/api/v1/transfers/{$transferId}/approve")->assertOk();
        $this->putJson("/api/v1/transfers/{$transferId}/receive")->assertOk();

        $this->assertDatabaseHas('notifications', [
            'title' => 'Transfer dibuat: TRF-NOTIF-001',
            'is_read' => false,
        ]);
        $this->assertDatabaseHas('notifications', [
            'title' => 'Transfer approved: TRF-NOTIF-001',
            'is_read' => false,
        ]);
        $this->assertDatabaseHas('notifications', [
            'title' => 'Transfer received: TRF-NOTIF-001',
            'is_read' => false,
        ]);
    }

    public function test_opname_workflow_creates_notifications(): void
    {
        $user = $this->actingAsRole();

        $warehouse = Warehouse::factory()->create(['code' => 'WH-OPN']);
        $product = Product::factory()->average()->create(['minimum_stock' => 3]);
        Inventory::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => 5,
        ]);

        $opnameId = $this->postJson('/api/v1/stock-opnames', [
            'warehouse_id' => $warehouse->id,
        ])->assertCreated()
            ->json('data.id');

        $this->postJson("/api/v1/stock-opnames/{$opnameId}/items", [
            'product_id' => $product->id,
            'physical_qty' => 4,
        ])->assertOk();
        $this->postJson("/api/v1/stock-opnames/{$opnameId}/approve")->assertOk();

        $opname = StockOpname::findOrFail($opnameId);
        $this->assertDatabaseHas('notifications', [
            'title' => "Stock opname dibuat: {$opname->opname_no}",
        ]);
        $this->assertDatabaseHas('notifications', [
            'title' => "Opname item dihitung: {$opname->opname_no}",
        ]);
        $this->assertDatabaseHas('notifications', [
            'title' => "Stock opname approved: {$opname->opname_no}",
        ]);
        $this->assertSame(1, StockOpnameItem::where('stock_opname_id', $opnameId)->count());
    }
}
