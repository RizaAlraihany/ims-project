<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            if (! Schema::hasColumn('products', 'unit_id')) {
                $table->foreignId('unit_id')->nullable()->after('category_id')->constrained()->nullOnDelete();
            }

            if (! Schema::hasColumn('products', 'cost_method')) {
                $table->enum('cost_method', ['FIFO', 'AVERAGE'])->default('AVERAGE')->after('average_cost');
            }

            if (! Schema::hasColumn('products', 'status')) {
                $table->boolean('status')->default(true)->after('cost_method');
            }

            if (! Schema::hasColumn('products', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('products', function (Blueprint $table): void {
            if (! $this->hasIndex('products', 'products_status_index')) {
                $table->index('status', 'products_status_index');
            }

            if (Schema::hasColumn('products', 'unit_id') && ! $this->hasIndex('products', 'products_category_id_unit_id_index')) {
                $table->index(['category_id', 'unit_id'], 'products_category_id_unit_id_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            if ($this->hasIndex('products', 'products_category_id_unit_id_index')) {
                $table->dropIndex('products_category_id_unit_id_index');
            }

            if ($this->hasIndex('products', 'products_status_index')) {
                $table->dropIndex('products_status_index');
            }
        });

        Schema::table('products', function (Blueprint $table): void {
            foreach (['deleted_at', 'status', 'cost_method'] as $column) {
                if (Schema::hasColumn('products', $column)) {
                    $table->dropColumn($column);
                }
            }

            if (Schema::hasColumn('products', 'unit_id')) {
                $table->dropConstrainedForeignId('unit_id');
            }
        });
    }

    private function hasIndex(string $table, string $name): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn (array $index): bool => ($index['name'] ?? null) === $name);
    }
};
