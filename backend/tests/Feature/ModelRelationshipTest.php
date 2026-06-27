<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Tests\TestCase;

class ModelRelationshipTest extends TestCase
{
    public function test_models_expose_expected_relationships(): void
    {
        $checks = [
            [new User(), 'transfers', HasMany::class],
            [new User(), 'stockMovements', HasMany::class],

            [new Category(), 'products', HasMany::class],

            [new Warehouse(), 'inventories', HasMany::class],
            [new Warehouse(), 'products', BelongsToMany::class],
            [new Warehouse(), 'stockBatches', HasMany::class],
            [new Warehouse(), 'outgoingTransfers', HasMany::class],
            [new Warehouse(), 'incomingTransfers', HasMany::class],
            [new Warehouse(), 'sourceStockMovements', HasMany::class],
            [new Warehouse(), 'destinationStockMovements', HasMany::class],

            [new Product(), 'category', BelongsTo::class],
            [new Product(), 'inventories', HasMany::class],
            [new Product(), 'warehouses', BelongsToMany::class],
            [new Product(), 'stockBatches', HasMany::class],
            [new Product(), 'transferItems', HasMany::class],
            [new Product(), 'transfers', BelongsToMany::class],
            [new Product(), 'stockMovements', HasMany::class],

            [new Inventory(), 'product', BelongsTo::class],
            [new Inventory(), 'warehouse', BelongsTo::class],

            [new StockBatch(), 'product', BelongsTo::class],
            [new StockBatch(), 'warehouse', BelongsTo::class],

            [new Transfer(), 'sourceWarehouse', BelongsTo::class],
            [new Transfer(), 'destinationWarehouse', BelongsTo::class],
            [new Transfer(), 'creator', BelongsTo::class],
            [new Transfer(), 'items', HasMany::class],
            [new Transfer(), 'products', BelongsToMany::class],

            [new TransferItem(), 'transfer', BelongsTo::class],
            [new TransferItem(), 'product', BelongsTo::class],

            [new StockMovement(), 'product', BelongsTo::class],
            [new StockMovement(), 'sourceWarehouse', BelongsTo::class],
            [new StockMovement(), 'destinationWarehouse', BelongsTo::class],
            [new StockMovement(), 'user', BelongsTo::class],
        ];

        foreach ($checks as [$model, $method, $expectedRelation]) {
            $this->assertInstanceOf(
                $expectedRelation,
                $model->{$method}(),
                sprintf('%s::%s should return %s.', $model::class, $method, $expectedRelation),
            );
        }
    }
}
