<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Product;
use App\Models\StockOpname;
use App\Models\Transfer;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class NotificationService
{
    public function lowStock(Product $product, Warehouse $warehouse, float $quantity): ?Notification
    {
        $minimumStock = (float) $product->minimum_stock;

        if ($quantity > $minimumStock) {
            return null;
        }

        $status = $quantity <= 0 ? 'Stock habis' : 'Stock menipis';
        $title = "Low Stock Alert: {$product->sku}";
        $message = "{$status} untuk {$product->name} di {$warehouse->code}. Qty {$quantity}, minimum {$minimumStock}.";

        return $this->createGlobal($title, $message);
    }

    public function syncLowStock(?int $warehouseId = null): int
    {
        $created = 0;

        Inventory::query()
            ->with(['product', 'warehouse'])
            ->join('products', 'inventories.product_id', '=', 'products.id')
            ->whereColumn('inventories.quantity', '<=', 'products.minimum_stock')
            ->when($warehouseId, fn (Builder $query) => $query->where('inventories.warehouse_id', $warehouseId))
            ->select('inventories.*')
            ->get()
            ->each(function (Inventory $inventory) use (&$created): void {
                if ($this->lowStock($inventory->product, $inventory->warehouse, (float) $inventory->quantity)?->wasRecentlyCreated) {
                    $created++;
                }
            });

        return $created;
    }

    public function transferCreated(Transfer $transfer): Notification
    {
        return $this->createGlobal(
            "Transfer dibuat: {$transfer->transfer_no}",
            "{$transfer->sourceWarehouse?->code} ke {$transfer->destinationWarehouse?->code} menunggu approval.",
        );
    }

    public function transferStatus(Transfer $transfer, string $status): Notification
    {
        return $this->createGlobal(
            "Transfer {$status}: {$transfer->transfer_no}",
            "{$transfer->sourceWarehouse?->code} ke {$transfer->destinationWarehouse?->code} status {$transfer->status}.",
        );
    }

    public function opnameCreated(StockOpname $opname): Notification
    {
        return $this->createGlobal(
            "Stock opname dibuat: {$opname->opname_no}",
            "Session opname {$opname->warehouse?->code} dibuat dan siap dihitung.",
        );
    }

    public function opnameSaved(StockOpname $opname, Product $product, float $difference): Notification
    {
        return $this->createGlobal(
            "Opname item dihitung: {$opname->opname_no}",
            "{$product->sku} memiliki selisih {$difference} pada {$opname->warehouse?->code}.",
        );
    }

    public function opnameApproved(StockOpname $opname): Notification
    {
        return $this->createGlobal(
            "Stock opname approved: {$opname->opname_no}",
            "Adjustment opname {$opname->warehouse?->code} sudah diproses.",
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function list(Request $request): array
    {
        $user = $request->user();
        $query = Notification::query()
            ->where(function (Builder $query) use ($user): void {
                $query->whereNull('user_id');

                if ($user) {
                    $query->orWhere('user_id', $user->id);
                }
            })
            ->when($request->filled('is_read'), fn (Builder $query) => $query->where('is_read', $request->boolean('is_read')));

        $summaryQuery = clone $query;
        $paginator = $query->latest('created_at')->paginate($request->integer('per_page', 10));

        return [
            'items' => collect($paginator->items())->map(fn (Notification $notification): array => $this->row($notification))->values(),
            'pagination' => $this->pagination($paginator),
            'summary' => [
                'total_rows' => (clone $summaryQuery)->count(),
                'unread_count' => (clone $summaryQuery)->where('is_read', false)->count(),
            ],
        ];
    }

    public function markAsRead(Notification $notification, User $user): Notification
    {
        if ($notification->user_id !== null && (int) $notification->user_id !== (int) $user->id) {
            abort(404);
        }

        $notification->forceFill(['is_read' => true])->save();

        return $notification;
    }

    private function createGlobal(string $title, string $message): Notification
    {
        return Notification::firstOrCreate(
            [
                'user_id' => null,
                'title' => $title,
                'message' => $message,
                'is_read' => false,
            ],
            [
                'created_at' => now(),
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function row(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'title' => $notification->title,
            'message' => $notification->message,
            'is_read' => $notification->is_read,
            'created_at' => $notification->created_at,
        ];
    }

    /**
     * @return array<string, int>
     */
    private function pagination(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
        ];
    }
}
