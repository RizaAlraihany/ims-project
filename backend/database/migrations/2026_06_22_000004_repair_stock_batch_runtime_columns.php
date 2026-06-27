<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_batches', function (Blueprint $table): void {
            if (! Schema::hasColumn('stock_batches', 'qty_received')) {
                $table->decimal('qty_received', 15, 2)->nullable()->after('batch_number');
            }

            if (! Schema::hasColumn('stock_batches', 'qty_remaining')) {
                $table->decimal('qty_remaining', 15, 2)->nullable()->after('qty_received');
            }

            if (! Schema::hasColumn('stock_batches', 'received_at')) {
                $table->dateTime('received_at')->nullable()->after('unit_cost');
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_batches', function (Blueprint $table): void {
            foreach (['received_at', 'qty_remaining', 'qty_received'] as $column) {
                if (Schema::hasColumn('stock_batches', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
