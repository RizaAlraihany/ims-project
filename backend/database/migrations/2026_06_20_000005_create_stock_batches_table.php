<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('batch_number')->index();
            $table->decimal('qty_received', 15, 2)->nullable();
            $table->decimal('qty_remaining', 15, 2)->nullable();
            $table->unsignedInteger('initial_qty');
            $table->unsignedInteger('remaining_qty');
            $table->decimal('unit_cost', 15, 2);
            $table->dateTime('received_at')->nullable();
            $table->date('received_date');
            $table->timestamps();

            $table->index(['product_id', 'warehouse_id', 'received_date'], 'stock_batches_fifo_lookup_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_batches');
    }
};
