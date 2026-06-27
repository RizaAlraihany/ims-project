<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Permission codes are limited to codes explicitly present in the current
     * project documents/contracts.
     */
    private const PERMISSIONS = [
        'product.view' => 'View Products',
        'product.create' => 'Create Products',
        'product.update' => 'Update Products',
        'product.delete' => 'Delete Products',
        'warehouse.view' => 'View Warehouses',
        'warehouse.create' => 'Create Warehouses',
        'stock_in.create' => 'Create Stock In',
        'stock_out.create' => 'Create Stock Out',
        'dashboard.view' => 'View Dashboard',
        'inventory.view' => 'View Inventory',
        'transfer.view' => 'View Transfers',
        'transfer.create' => 'Create Transfers',
        'transfer.approve' => 'Approve Transfers',
        'transfer.transit' => 'Mark Transfers In Transit',
        'transfer.receive' => 'Receive Transfers',
        'transfer.complete' => 'Complete Transfers',
        'transfer.reject' => 'Reject Transfers',
        'opname.view' => 'View Stock Opname',
        'opname.create' => 'Create Stock Opname',
        'opname.approve' => 'Approve Stock Opname',
        'report.view' => 'View Reports',
        'report.export' => 'Export Reports',
        'audit.view' => 'View Audit Trail',
        'user.view' => 'View Users',
        'user.create' => 'Create Users',
        'user.update' => 'Update Users',
        'user.delete' => 'Delete Users',
        'role.view' => 'View Roles',
        'role.update_permission' => 'Update Role Permissions',
        'setting.view' => 'View Settings',
        'setting.update' => 'Update Settings',
    ];

    private const ROLES = [
        'Super Admin' => [
            'description' => 'Full system access.',
            'permissions' => [
                'product.view',
                'product.create',
                'product.update',
                'product.delete',
                'warehouse.view',
                'warehouse.create',
                'stock_in.create',
                'stock_out.create',
                'dashboard.view',
                'inventory.view',
                'transfer.view',
                'transfer.create',
                'transfer.approve',
                'transfer.transit',
                'transfer.receive',
                'transfer.complete',
                'transfer.reject',
                'opname.view',
                'opname.create',
                'opname.approve',
                'report.view',
                'report.export',
                'audit.view',
                'user.view',
                'user.create',
                'user.update',
                'user.delete',
                'role.view',
                'role.update_permission',
                'setting.view',
                'setting.update',
            ],
        ],
        'Admin Gudang' => [
            'description' => 'Warehouse master data and stock operations.',
            'permissions' => [
                'product.view',
                'product.create',
                'product.update',
                'warehouse.view',
                'warehouse.create',
                'stock_in.create',
                'stock_out.create',
                'dashboard.view',
                'inventory.view',
                'transfer.view',
                'transfer.create',
                'transfer.approve',
                'transfer.transit',
                'transfer.receive',
                'transfer.complete',
                'transfer.reject',
                'opname.view',
                'opname.create',
                'opname.approve',
                'report.view',
                'report.export',
                'setting.view',
            ],
        ],
        'Operator' => [
            'description' => 'Daily warehouse stock operations.',
            'permissions' => [
                'product.view',
                'warehouse.view',
                'stock_in.create',
                'stock_out.create',
                'dashboard.view',
                'inventory.view',
                'transfer.view',
                'transfer.create',
                'opname.view',
                'opname.create',
            ],
        ],
        'Auditor' => [
            'description' => 'Read-only inventory review access.',
            'permissions' => [
                'product.view',
                'warehouse.view',
                'dashboard.view',
                'inventory.view',
                'report.view',
                'report.export',
                'audit.view',
            ],
        ],
    ];

    public function run(): void
    {
        $permissions = collect(self::PERMISSIONS)
            ->mapWithKeys(fn (string $name, string $code) => [
                $code => Permission::updateOrCreate(
                    ['code' => $code],
                    ['name' => $name],
                ),
            ]);

        foreach (self::ROLES as $roleName => $roleData) {
            $role = Role::updateOrCreate(
                ['name' => $roleName],
                ['description' => $roleData['description']],
            );

            $role->permissions()->sync(
                collect($roleData['permissions'])
                    ->map(fn (string $code) => $permissions[$code]->id)
                    ->all(),
            );
        }
    }
}
