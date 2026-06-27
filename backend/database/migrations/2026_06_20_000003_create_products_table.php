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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sku', 50)->unique();
            $table->string('barcode', 100)->unique();
            $table->string('name');
            $table->decimal('minimum_stock', 15, 2)->default(0);
            $table->decimal('average_cost', 15, 2)->default(0);
            $table->enum('cost_method', ['FIFO', 'AVERAGE'])->default('AVERAGE');
            $table->boolean('status')->default(true)->index();
            $table->enum('valuation_method', ['average', 'fifo'])->default('average');
            $table->string('unit', 30)->default('pcs');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category_id', 'unit_id']);
            $table->index('sku');
            $table->index('barcode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
