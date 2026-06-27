<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$req = Illuminate\Http\Request::create('/api/v1/reports', 'GET', [
    'warehouse_id' => 1,
    'category_id' => 1,
    'search' => 'laptop',
    'movement_type' => 'STOCK_IN',
    'status' => 'APPROVED',
    'date_from' => '2026-06-01',
    'date_to' => '2026-06-30'
]);
try { app(App\Services\ReportService::class)->stocks($req); echo "STOCKS OK\n"; } catch(\Exception $e) { echo "STOCKS ERROR: " . $e->getMessage() . "\n"; }
try { app(App\Services\ReportService::class)->movements($req); echo "MOVEMENTS OK\n"; } catch(\Exception $e) { echo "MOVEMENTS ERROR: " . $e->getMessage() . "\n"; }
try { app(App\Services\ReportService::class)->transfers($req); echo "TRANSFERS OK\n"; } catch(\Exception $e) { echo "TRANSFERS ERROR: " . $e->getMessage() . "\n"; }
try { app(App\Services\ReportService::class)->opnames($req); echo "OPNAMES OK\n"; } catch(\Exception $e) { echo "OPNAMES ERROR: " . $e->getMessage() . "\n"; }
