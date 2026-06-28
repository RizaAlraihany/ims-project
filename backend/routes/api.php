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



Route::prefix('v1')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'user']);
        });
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/dashboard/summary', [DashboardController::class, 'summary'])->middleware('permission:dashboard.view');

        Route::get('/products/barcode/{barcode}', [ProductController::class, 'showByBarcode'])->middleware('permission:product.view');
        Route::post('/products/import', [ProductController::class, 'import'])->middleware('permission:product.create');
        Route::get('/products/export', [ProductController::class, 'export'])->middleware('permission:report.export');
        Route::get('/products', [ProductController::class, 'index'])->middleware('permission:product.view');
        Route::post('/products', [ProductController::class, 'store'])->middleware('permission:product.create');
        Route::get('/products/{product}', [ProductController::class, 'show'])->middleware('permission:product.view')->name('v1.products.show');
        Route::put('/products/{product}', [ProductController::class, 'update'])->middleware('permission:product.update');
        Route::patch('/products/{product}', [ProductController::class, 'update'])->middleware('permission:product.update');
        Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('permission:product.delete');

        Route::get('/categories', [CategoryController::class, 'index'])->middleware('permission:product.view');
        Route::post('/categories', [CategoryController::class, 'store'])->middleware('permission:product.create');
        Route::get('/categories/{category}', [CategoryController::class, 'show'])->middleware('permission:product.view');
        Route::put('/categories/{category}', [CategoryController::class, 'update'])->middleware('permission:product.update');
        Route::patch('/categories/{category}', [CategoryController::class, 'update'])->middleware('permission:product.update');
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->middleware('permission:product.delete');

        Route::get('/units', [UnitController::class, 'index'])->middleware('permission:product.view');
        Route::post('/units', [UnitController::class, 'store'])->middleware('permission:product.create');
        Route::get('/units/{unit}', [UnitController::class, 'show'])->middleware('permission:product.view');
        Route::put('/units/{unit}', [UnitController::class, 'update'])->middleware('permission:product.update');
        Route::patch('/units/{unit}', [UnitController::class, 'update'])->middleware('permission:product.update');
        Route::delete('/units/{unit}', [UnitController::class, 'destroy'])->middleware('permission:product.delete');

        Route::get('/warehouses', [WarehouseController::class, 'index'])->middleware('permission:warehouse.view');
        Route::post('/warehouses', [WarehouseController::class, 'store'])->middleware('permission:warehouse.create');
        Route::get('/warehouses/{warehouse}', [WarehouseController::class, 'show'])->middleware('permission:warehouse.view');
        Route::put('/warehouses/{warehouse}', [WarehouseController::class, 'update'])->middleware('permission:warehouse.create');
        Route::patch('/warehouses/{warehouse}', [WarehouseController::class, 'update'])->middleware('permission:warehouse.create');
        Route::delete('/warehouses/{warehouse}', [WarehouseController::class, 'destroy'])->middleware('permission:warehouse.create');
        Route::get('/contacts', [\App\Http\Controllers\API\ContactController::class, 'index'])->middleware('permission:product.view');
        Route::post('/contacts', [\App\Http\Controllers\API\ContactController::class, 'store'])->middleware('permission:product.create');
        Route::get('/contacts/{contact}', [\App\Http\Controllers\API\ContactController::class, 'show'])->middleware('permission:product.view');
        Route::put('/contacts/{contact}', [\App\Http\Controllers\API\ContactController::class, 'update'])->middleware('permission:product.update');
        Route::patch('/contacts/{contact}', [\App\Http\Controllers\API\ContactController::class, 'update'])->middleware('permission:product.update');
        Route::delete('/contacts/{contact}', [\App\Http\Controllers\API\ContactController::class, 'destroy'])->middleware('permission:product.delete');

        Route::get('/inventory', [InventoryController::class, 'index'])->middleware('permission:inventory.view');
        Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock'])->middleware('permission:inventory.view');
        Route::get('/inventory/stock-card', [InventoryController::class, 'stockCard'])->middleware('permission:inventory.view');
        Route::get('/movements', [MovementController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('/stock-in', [MovementController::class, 'storeIn'])->middleware('permission:stock_in.create');
        Route::post('/stock-out', [MovementController::class, 'storeOut'])->middleware('permission:stock_out.create');

        Route::get('/transfers', [TransferController::class, 'index'])->middleware('permission:transfer.view');
        Route::post('/transfers', [TransferController::class, 'store'])->middleware('permission:transfer.create');
        Route::get('/transfers/{transfer}', [TransferController::class, 'show'])->middleware('permission:transfer.view');
        Route::put('/transfers/{transfer}/approve', [TransferController::class, 'approve'])->middleware('permission:transfer.approve');
        Route::put('/transfers/{transfer}/transit', [TransferController::class, 'transit'])->middleware('permission:transfer.transit');
        Route::put('/transfers/{transfer}/receive', [TransferController::class, 'receive'])->middleware('permission:transfer.receive');
        Route::put('/transfers/{transfer}/complete', [TransferController::class, 'complete'])->middleware('permission:transfer.complete');
        Route::put('/transfers/{transfer}/reject', [TransferController::class, 'reject'])->middleware('permission:transfer.reject');

        Route::get('/stock-opnames', [StockOpnameController::class, 'index'])->middleware('permission:opname.view');
        Route::post('/stock-opnames', [StockOpnameController::class, 'store'])->middleware('permission:opname.create');
        Route::get('/stock-opnames/{stockOpname}', [StockOpnameController::class, 'show'])->middleware('permission:opname.view');
        Route::post('/stock-opnames/{stockOpname}/items', [StockOpnameController::class, 'saveItem'])->middleware('permission:opname.create');
        Route::post('/stock-opnames/{stockOpname}/approve', [StockOpnameController::class, 'approve'])->middleware('permission:opname.approve');

        Route::get('/reports/stocks', [ReportController::class, 'stocks'])->middleware('permission:report.view');
        Route::get('/reports/movements', [ReportController::class, 'movements'])->middleware('permission:report.view');
        Route::get('/reports/transfers', [ReportController::class, 'transfers'])->middleware('permission:report.view');
        Route::get('/reports/opnames', [ReportController::class, 'opnames'])->middleware('permission:report.view');

        Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:audit.view');

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

        Route::get('/users', [UserController::class, 'index'])->middleware('permission:user.view');
        Route::post('/users', [UserController::class, 'store'])->middleware('permission:user.create');
        Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:user.update');
        Route::patch('/users/{user}', [UserController::class, 'update'])->middleware('permission:user.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:user.delete');

        Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:role.view');
        Route::get('/permissions', [RoleController::class, 'permissions'])->middleware('permission:role.view');
        Route::put('/roles/{role}/permissions', [RoleController::class, 'syncPermissions'])->middleware('permission:role.update_permission');
        
        Route::get('/settings', [SettingController::class, 'index'])->middleware('permission:setting.view');
        Route::put('/settings', [SettingController::class, 'update'])->middleware('permission:setting.update');
    });
});
