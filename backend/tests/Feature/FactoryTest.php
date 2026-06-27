<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FactoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_core_factories_create_valid_records(): void
    {
        $user = User::factory()->admin()->create();
        $warehouse = Warehouse::factory()->create();
        $product = Product::factory()->fifo()->create();

        $this->assertSame('Admin', $user->role);
        $this->assertStringStartsWith('WH-', $warehouse->code);
        $this->assertSame('fifo', $product->valuation_method);
        $this->assertNotNull($product->category);
    }
}
