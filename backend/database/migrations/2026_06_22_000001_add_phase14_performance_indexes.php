<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventories', function (Blueprint $table): void {
            if (! $this->hasIndex('inventories', 'inventories_warehouse_qty_product_index')) {
                $table->index(['warehouse_id', 'quantity', 'product_id'], 'inventories_warehouse_qty_product_index');
            }
        });

        Schema::table('stock_movements', function (Blueprint $table): void {
            if (! Schema::hasColumn('stock_movements', 'movement_type')) {
                $table->enum('movement_type', ['STOCK_IN', 'STOCK_OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT', 'OPNAME'])
                    ->nullable()
                    ->after('reference_no');
            }

            if (! Schema::hasColumn('stock_movements', 'warehouse_id')) {
                $table->foreignId('warehouse_id')->nullable()->after('product_id')->constrained()->restrictOnDelete();
            }

            if (! Schema::hasColumn('stock_movements', 'balance_after')) {
                $table->decimal('balance_after', 15, 2)->nullable()->after('quantity');
            }

            if (! Schema::hasColumn('stock_movements', 'notes')) {
                $table->text('notes')->nullable()->after('unit_cost');
            }

            if (! Schema::hasColumn('stock_movements', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('notes')->constrained('users')->nullOnDelete();
            }

            if (! $this->hasIndex('stock_movements', 'stock_movements_type_created_index')) {
                $table->index(['type', 'created_at'], 'stock_movements_type_created_index');
            }

            if (! $this->hasIndex('stock_movements', 'stock_movements_movement_created_index')) {
                $table->index(['movement_type', 'created_at'], 'stock_movements_movement_created_index');
            }

            if (! $this->hasIndex('stock_movements', 'stock_movements_warehouse_created_index')) {
                $table->index(['warehouse_id', 'created_at'], 'stock_movements_warehouse_created_index');
            }

            if (! $this->hasIndex('stock_movements', 'stock_movements_ref_product_type_index')) {
                $table->index(['reference_no', 'product_id', 'movement_type'], 'stock_movements_ref_product_type_index');
            }
        });

        Schema::table('transfers', function (Blueprint $table): void {
            if (! $this->hasIndex('transfers', 'transfers_status_created_index')) {
                $table->index(['status', 'created_at'], 'transfers_status_created_index');
            }

            if (! $this->hasIndex('transfers', 'transfers_source_status_created_index')) {
                $table->index(['source_warehouse_id', 'status', 'created_at'], 'transfers_source_status_created_index');
            }

            if (! $this->hasIndex('transfers', 'transfers_dest_status_created_index')) {
                $table->index(['dest_warehouse_id', 'status', 'created_at'], 'transfers_dest_status_created_index');
            }
        });

        Schema::table('stock_opnames', function (Blueprint $table): void {
            if (! $this->hasIndex('stock_opnames', 'stock_opnames_warehouse_status_created_index')) {
                $table->index(['warehouse_id', 'status', 'created_at'], 'stock_opnames_warehouse_status_created_index');
            }
        });

        Schema::table('notifications', function (Blueprint $table): void {
            if (! $this->hasIndex('notifications', 'notifications_user_read_created_index')) {
                $table->index(['user_id', 'is_read', 'created_at'], 'notifications_user_read_created_index');
            }

            if (! $this->hasIndex('notifications', 'notifications_read_created_index')) {
                $table->index(['is_read', 'created_at'], 'notifications_read_created_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropIndex('notifications_read_created_index');
            $table->dropIndex('notifications_user_read_created_index');
        });

        Schema::table('stock_opnames', function (Blueprint $table): void {
            $table->dropIndex('stock_opnames_warehouse_status_created_index');
        });

        Schema::table('transfers', function (Blueprint $table): void {
            $table->dropIndex('transfers_dest_status_created_index');
            $table->dropIndex('transfers_source_status_created_index');
            $table->dropIndex('transfers_status_created_index');
        });

        Schema::table('stock_movements', function (Blueprint $table): void {
            $table->dropIndex('stock_movements_ref_product_type_index');
            $table->dropIndex('stock_movements_warehouse_created_index');
            $table->dropIndex('stock_movements_movement_created_index');
            $table->dropIndex('stock_movements_type_created_index');
        });

        Schema::table('inventories', function (Blueprint $table): void {
            $table->dropIndex('inventories_warehouse_qty_product_index');
        });
    }

    private function hasIndex(string $table, string $name): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn (array $index): bool => ($index['name'] ?? null) === $name);
    }
};
