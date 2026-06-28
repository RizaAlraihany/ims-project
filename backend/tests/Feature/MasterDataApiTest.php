<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Category;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class MasterDataApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_products_can_be_searched_and_filtered_by_category(): void
    {
        $this->actingAsRole();

        $needle = Product::factory()->create([
            'name' => 'Premium Scanner Item',
            'sku' => 'SKU-SCAN-001',
        ]);
        Product::factory()->count(3)->create();

        $this->getJson("/api/v1/products?search=Scanner&category_id={$needle->category_id}")
            ->assertOk()
            ->assertJsonPath('data.0.id', $needle->id);
    }

    public function test_warehouses_can_be_listed(): void
    {
        $this->actingAsRole();
        Warehouse::factory()->count(5)->create();

        $this->getJson('/api/v1/warehouses')
            ->assertOk()
            ->assertJsonCount(5, 'data');
    }

    public function test_categories_can_be_created_updated_and_deleted(): void
    {
        $this->actingAsRole();

        $response = $this->postJson('/api/v1/categories', [
            'name' => 'Frozen Food',
            'description' => 'Produk beku',
        ]);

        $categoryId = $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Frozen Food')
            ->json('data.id');

        $this->getJson('/api/v1/categories?search=Frozen')
            ->assertOk()
            ->assertJsonPath('data.0.id', $categoryId);

        $this->putJson("/api/v1/categories/{$categoryId}", [
            'name' => 'Frozen Goods',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Frozen Goods');

        $this->deleteJson("/api/v1/categories/{$categoryId}")
            ->assertOk();
    }

    public function test_units_crud_api(): void
    {
        $this->actingAsRole();

        $response = $this->postJson('/api/v1/units', [
            'name' => 'Carton',
            'symbol' => 'CTN',
        ]);

        $unitId = $response
            ->assertCreated()
            ->assertJsonPath('data.symbol', 'CTN')
            ->json('data.id');

        $this->getJson('/api/v1/units?search=CTN')
            ->assertOk()
            ->assertJsonPath('data.0.id', $unitId);

        $this->putJson("/api/v1/units/{$unitId}", [
            'name' => 'Carton Box',
            'symbol' => 'CTN',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Carton Box');

        $this->deleteJson("/api/v1/units/{$unitId}")
            ->assertOk();
    }

    public function test_products_can_be_created_with_unit_and_exported(): void
    {
        $this->actingAsRole();

        $category = Category::factory()->create();
        $unit = Unit::factory()->create(['symbol' => 'PCS']);

        $this->postJson('/api/v1/products', [
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'sku' => 'SKU-PHASE4-001',
            'barcode' => '8998887776661',
            'name' => '=1+1',
            'minimum_stock' => 3,
            'cost_method' => 'FIFO',
            'status' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.sku', 'SKU-PHASE4-001');

        $response = $this->getJson('/api/v1/products/export')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $this->assertStringContainsString("'=1+1", $response->streamedContent());
    }

    public function test_products_can_be_imported_from_csv(): void
    {
        $this->actingAsRole();

        $category = Category::factory()->create();
        $unit = Unit::factory()->create(['symbol' => 'BOX']);
        $csv = implode("\n", [
            'sku,barcode,name,category_id,unit_id,minimum_stock,cost_method,status',
            "SKU-IMPORT-001,8998887776662,Imported Product,{$category->id},{$unit->id},5,AVERAGE,1",
        ]);
        $file = UploadedFile::fake()->createWithContent('products.csv', $csv);

        $this->postJson('/api/v1/products/import', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.created', 1);

        $this->assertDatabaseHas('products', [
            'sku' => 'SKU-IMPORT-001',
            'name' => 'Imported Product',
        ]);
    }

    public function test_product_can_be_resolved_by_barcode_for_scanner_flow(): void
    {
        $this->actingAsRole();

        $product = Product::factory()->create([
            'barcode' => '8991234567890',
        ]);

        $this->getJson('/api/v1/products/8991234567890')
            ->assertOk()
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonPath('data.barcode', '8991234567890');
    }
}
