<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transfers', function (Blueprint $table): void {
            if (! Schema::hasColumn('transfers', 'in_transit_at')) {
                $table->timestamp('in_transit_at')->nullable()->after('approved_by');
            }

            if (! Schema::hasColumn('transfers', 'received_at')) {
                $table->timestamp('received_at')->nullable()->after('received_by');
            }

            if (! Schema::hasColumn('transfers', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('received_at');
            }

            if (! Schema::hasColumn('transfers', 'rejected_at')) {
                $table->timestamp('rejected_at')->nullable()->after('completed_at');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE transfers MODIFY status ENUM('DRAFT','APPROVED','IN_TRANSIT','RECEIVED','COMPLETED','REJECTED','Pending','Transit') NOT NULL DEFAULT 'DRAFT'");
        }
    }

    public function down(): void
    {
        Schema::table('transfers', function (Blueprint $table): void {
            foreach (['in_transit_at', 'received_at', 'completed_at', 'rejected_at'] as $column) {
                if (Schema::hasColumn('transfers', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
