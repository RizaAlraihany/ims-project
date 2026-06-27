<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Role;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_initial_ims_data(): void
    {
        $this->seed();

        $this->assertDatabaseHas('users', [
            'email' => 'admin@ims.test',
            'role' => 'Admin',
        ]);
        $this->assertSame(5, Warehouse::count());
        $this->assertSame(50, Product::count());
        $this->assertGreaterThan(0, Inventory::count());
        $this->assertGreaterThan(0, StockBatch::count());
        $this->assertGreaterThan(0, StockMovement::where('reference_no', 'like', 'INIT-%')->count());

        $this->assertSame(4, Role::count());
        $this->assertSame(31, Permission::count());
        $this->assertDatabaseHas('roles', ['name' => 'Super Admin']);
        $this->assertDatabaseHas('roles', ['name' => 'Admin Gudang']);
        $this->assertDatabaseHas('roles', ['name' => 'Operator']);
        $this->assertDatabaseHas('roles', ['name' => 'Auditor']);
        $this->assertDatabaseHas('permissions', ['code' => 'product.view']);
        $this->assertDatabaseHas('permissions', ['code' => 'stock_in.create']);
        $this->assertDatabaseHas('permissions', ['code' => 'user.view']);
        $this->assertDatabaseHas('permissions', ['code' => 'role.update_permission']);
        $this->assertDatabaseHas('permissions', ['code' => 'setting.update']);
        $this->assertDatabaseHas('permissions', ['code' => 'transfer.complete']);
    }
}
