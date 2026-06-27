<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class Phase2DatabaseSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_phase_two_tables_exist(): void
    {
        foreach ([
            'roles',
            'permissions',
            'role_permissions',
            'users',
            'categories',
            'units',
            'products',
            'warehouses',
            'inventory_stocks',
            'stock_batches',
            'stock_movements',
            'transfers',
            'transfer_items',
            'stock_opnames',
            'stock_opname_items',
            'audit_logs',
            'notifications',
            'settings',
        ] as $table) {
            $this->assertTrue(Schema::hasTable($table), "{$table} table is missing.");
        }
    }

    public function test_phase_two_core_columns_exist(): void
    {
        $expectedColumns = [
            'users' => ['role_id', 'name', 'email', 'password', 'phone', 'is_active', 'deleted_at'],
            'products' => ['sku', 'barcode', 'name', 'category_id', 'unit_id', 'minimum_stock', 'cost_method', 'status', 'deleted_at'],
            'warehouses' => ['code', 'name', 'address', 'manager_name', 'status', 'deleted_at'],
            'inventory_stocks' => ['product_id', 'warehouse_id', 'quantity'],
            'stock_batches' => ['product_id', 'warehouse_id', 'qty_received', 'qty_remaining', 'unit_cost', 'received_at'],
            'stock_movements' => ['reference_no', 'movement_type', 'product_id', 'warehouse_id', 'quantity', 'balance_after', 'notes', 'created_by'],
            'transfers' => ['transfer_no', 'source_warehouse_id', 'destination_warehouse_id', 'status', 'notes', 'created_by', 'approved_by', 'received_by'],
            'stock_opnames' => ['opname_no', 'warehouse_id', 'status', 'performed_by', 'approved_by'],
            'stock_opname_items' => ['stock_opname_id', 'product_id', 'system_qty', 'physical_qty', 'difference_qty'],
            'audit_logs' => ['user_id', 'action', 'table_name', 'record_id', 'old_values', 'new_values', 'ip_address', 'created_at'],
            'notifications' => ['user_id', 'title', 'message', 'is_read', 'created_at'],
            'settings' => ['key', 'value'],
        ];

        foreach ($expectedColumns as $table => $columns) {
            foreach ($columns as $column) {
                $this->assertTrue(Schema::hasColumn($table, $column), "{$table}.{$column} column is missing.");
            }
        }
    }
}
