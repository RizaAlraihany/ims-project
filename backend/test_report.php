<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$req = Illuminate\Http\Request::create('/api/v1/reports', 'GET', ['warehouse_id' => 1, 'category_id' => 1, 'search' => 'a']);
try { app(App\Services\ReportService::class)->movements($req); echo "MOVEMENTS OK\n"; } catch(\Exception $e) { echo $e->getMessage() . "\n"; }
try { app(App\Services\ReportService::class)->transfers($req); echo "TRANSFERS OK\n"; } catch(\Exception $e) { echo $e->getMessage() . "\n"; }
try { app(App\Services\ReportService::class)->opnames($req); echo "OPNAMES OK\n"; } catch(\Exception $e) { echo $e->getMessage() . "\n"; }
