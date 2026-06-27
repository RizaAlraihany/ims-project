<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'transfer_no',
    'source_warehouse_id',
    'destination_warehouse_id',
    'dest_warehouse_id',
    'created_by',
    'approved_by',
    'received_by',
    'in_transit_at',
    'received_at',
    'completed_at',
    'rejected_at',
    'status',
    'notes',
])]
class Transfer extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'in_transit_at' => 'datetime',
            'received_at' => 'datetime',
            'completed_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function sourceWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'source_warehouse_id');
    }

    public function destinationWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'dest_warehouse_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransferItem::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'transfer_items')
            ->withPivot(['id', 'quantity'])
            ->withTimestamps();
    }
}
