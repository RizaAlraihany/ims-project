<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\AuditLogController;
use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\DashboardController;
use App\Http\Controllers\API\InventoryController;
use App\Http\Controllers\API\MovementController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\ProductController;
use App\Http\Controllers\API\StockOpnameController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\RoleController;
use App\Http\Controllers\API\SettingController;
use App\Http\Controllers\API\TransferController;
use App\Http\Controllers\API\UnitController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    Route::get('/products/barcode/{barcode}', [ProductController::class, 'showByBarcode']);
    Route::post('/products/import', [ProductController::class, 'import']);
    Route::get('/products/export', [ProductController::class, 'export']);
    Route::apiResource('products', ProductController::class)->except(['show']);
    Route::get('/products/{product}', [ProductController::class, 'show'])->name('products.show');
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('warehouses', WarehouseController::class);
    Route::apiResource('contacts', \App\Http\Controllers\API\ContactController::class);

    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::get('/inventory/stock-card', [InventoryController::class, 'stockCard']);

    Route::get('/movements', [MovementController::class, 'index']);
    Route::post('/movements/in', [MovementController::class, 'storeIn']);
    Route::post('/movements/out', [MovementController::class, 'storeOut']);
    Route::post('/stock-in', [MovementController::class, 'storeIn']);
    Route::post('/stock-out', [MovementController::class, 'storeOut']);

    Route::get('/transfers', [TransferController::class, 'index']);
    Route::post('/transfers', [TransferController::class, 'store']);
    Route::get('/transfers/{transfer}', [TransferController::class, 'show']);
    Route::put('/transfers/{transfer}/approve', [TransferController::class, 'approve']);
    Route::put('/transfers/{transfer}/transit', [TransferController::class, 'transit']);
    Route::put('/transfers/{transfer}/receive', [TransferController::class, 'receive']);
    Route::put('/transfers/{transfer}/complete', [TransferController::class, 'complete']);
    Route::put('/transfers/{transfer}/reject', [TransferController::class, 'reject']);

    Route::get('/stock-opnames', [StockOpnameController::class, 'index']);
    Route::post('/stock-opnames', [StockOpnameController::class, 'store']);
    Route::get('/stock-opnames/{stockOpname}', [StockOpnameController::class, 'show']);
    Route::post('/stock-opnames/{stockOpname}/items', [StockOpnameController::class, 'saveItem']);
    Route::post('/stock-opnames/{stockOpname}/approve', [StockOpnameController::class, 'approve']);

    Route::get('/reports/stocks', [ReportController::class, 'stocks']);
    Route::get('/reports/movements', [ReportController::class, 'movements']);
    Route::get('/reports/transfers', [ReportController::class, 'transfers']);
    Route::get('/reports/opnames', [ReportController::class, 'opnames']);

    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    Route::apiResource('users', UserController::class)->except(['show']);
    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/permissions', [RoleController::class, 'permissions']);
    Route::put('/roles/{role}/permissions', [RoleController::class, 'syncPermissions']);
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);
});

Route::prefix('v1')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'user']);
        });
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

        Route::get('/products/barcode/{barcode}', [ProductController::class, 'showByBarcode']);
        Route::post('/products/import', [ProductController::class, 'import']);
        Route::get('/products/export', [ProductController::class, 'export']);
        Route::apiResource('products', ProductController::class)->except(['show']);
        Route::get('/products/{product}', [ProductController::class, 'show'])->name('v1.products.show');
        Route::apiResource('categories', CategoryController::class);
        Route::apiResource('units', UnitController::class);
        Route::apiResource('warehouses', WarehouseController::class);
        Route::apiResource('contacts', \App\Http\Controllers\API\ContactController::class);

        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);
        Route::get('/inventory/stock-card', [InventoryController::class, 'stockCard']);
        Route::get('/movements', [MovementController::class, 'index']);
        Route::post('/stock-in', [MovementController::class, 'storeIn']);
        Route::post('/stock-out', [MovementController::class, 'storeOut']);

        Route::get('/transfers', [TransferController::class, 'index']);
        Route::post('/transfers', [TransferController::class, 'store']);
        Route::get('/transfers/{transfer}', [TransferController::class, 'show']);
        Route::put('/transfers/{transfer}/approve', [TransferController::class, 'approve']);
        Route::put('/transfers/{transfer}/transit', [TransferController::class, 'transit']);
        Route::put('/transfers/{transfer}/receive', [TransferController::class, 'receive']);
        Route::put('/transfers/{transfer}/complete', [TransferController::class, 'complete']);
        Route::put('/transfers/{transfer}/reject', [TransferController::class, 'reject']);

        Route::get('/stock-opnames', [StockOpnameController::class, 'index']);
        Route::post('/stock-opnames', [StockOpnameController::class, 'store']);
        Route::get('/stock-opnames/{stockOpname}', [StockOpnameController::class, 'show']);
        Route::post('/stock-opnames/{stockOpname}/items', [StockOpnameController::class, 'saveItem']);
        Route::post('/stock-opnames/{stockOpname}/approve', [StockOpnameController::class, 'approve']);

        Route::get('/reports/stocks', [ReportController::class, 'stocks']);
        Route::get('/reports/movements', [ReportController::class, 'movements']);
        Route::get('/reports/transfers', [ReportController::class, 'transfers']);
        Route::get('/reports/opnames', [ReportController::class, 'opnames']);

        Route::get('/audit-logs', [AuditLogController::class, 'index']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

        Route::apiResource('users', UserController::class)->except(['show']);
        Route::get('/roles', [RoleController::class, 'index']);
        Route::get('/permissions', [RoleController::class, 'permissions']);
        Route::put('/roles/{role}/permissions', [RoleController::class, 'syncPermissions']);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
    });
});
