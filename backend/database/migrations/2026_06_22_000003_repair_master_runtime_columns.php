<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouses', function (Blueprint $table): void {
            if (! Schema::hasColumn('warehouses', 'address')) {
                $table->text('address')->nullable()->after('name');
            }

            if (! Schema::hasColumn('warehouses', 'manager_name')) {
                $table->string('manager_name', 150)->nullable()->after('address');
            }

            if (! Schema::hasColumn('warehouses', 'status')) {
                $table->boolean('status')->default(true)->after('manager_name');
            }

            if (! Schema::hasColumn('warehouses', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('warehouses', function (Blueprint $table): void {
            if (Schema::hasColumn('warehouses', 'status') && ! $this->hasIndex('warehouses', 'warehouses_status_index')) {
                $table->index('status', 'warehouses_status_index');
            }
        });

        Schema::table('categories', function (Blueprint $table): void {
            if (! Schema::hasColumn('categories', 'description')) {
                $table->text('description')->nullable()->after('name');
            }

            if (! Schema::hasColumn('categories', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::table('warehouses', function (Blueprint $table): void {
            if ($this->hasIndex('warehouses', 'warehouses_status_index')) {
                $table->dropIndex('warehouses_status_index');
            }
        });

        Schema::table('warehouses', function (Blueprint $table): void {
            foreach (['deleted_at', 'status', 'manager_name', 'address'] as $column) {
                if (Schema::hasColumn('warehouses', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('categories', function (Blueprint $table): void {
            foreach (['deleted_at', 'description'] as $column) {
                if (Schema::hasColumn('categories', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    private function hasIndex(string $table, string $name): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn (array $index): bool => ($index['name'] ?? null) === $name);
    }
};
