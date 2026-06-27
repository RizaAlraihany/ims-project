<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'product_id',
    'warehouse_id',
    'batch_number',
    'qty_received',
    'qty_remaining',
    'initial_qty',
    'remaining_qty',
    'unit_cost',
    'received_at',
    'received_date',
])]
class StockBatch extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'initial_qty' => 'integer',
            'remaining_qty' => 'integer',
            'qty_received' => 'decimal:2',
            'qty_remaining' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'received_at' => 'datetime',
            'received_date' => 'date',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
}
