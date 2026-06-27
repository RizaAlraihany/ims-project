<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\ProductRequest;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = Product::query()
            ->with(['category', 'unitRecord'])
            ->withSum('inventories as total_stock', 'quantity')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('category_id'), fn ($query) => $query->where('category_id', $request->integer('category_id')))
            ->when($request->filled('unit_id'), fn ($query) => $query->where('unit_id', $request->integer('unit_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->boolean('status')))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($products);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $product = Product::create($request->validated());

        return response()->json([
            'message' => 'Produk berhasil dibuat.',
            'data' => $product->load(['category', 'unitRecord']),
        ], 201);
    }

    public function show(string $product): JsonResponse
    {
        return response()->json([
            'data' => $this->resolveProduct($product)->load(['category', 'unitRecord', 'inventories.warehouse']),
        ]);
    }

    public function showByBarcode(string $barcode): JsonResponse
    {
        return response()->json([
            'data' => $this->resolveProduct($barcode)->load(['category', 'unitRecord', 'inventories.warehouse']),
        ]);
    }

    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        $product->update($request->validated());

        return response()->json([
            'message' => 'Produk berhasil diperbarui.',
            'data' => $product->load(['category', 'unitRecord']),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        if ($product->stockMovements()->exists() || $product->transferItems()->exists() || $product->inventories()->exists()) {
            return response()->json([
                'message' => 'Produk tidak dapat dihapus karena memiliki transaksi atau stok.',
            ], 422);
        }

        $product->delete();

        return response()->json([
            'message' => 'Produk berhasil dihapus.',
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt'],
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $header = fgetcsv($handle);
        $created = 0;
        $updated = 0;
        $errors = [];

        if (! $header) {
            return response()->json(['message' => 'File CSV kosong.'], 422);
        }

        while (($row = fgetcsv($handle)) !== false) {
            $payload = array_combine($header, $row);

            if (! is_array($payload)) {
                continue;
            }

            $payload['cost_method'] = strtoupper((string) ($payload['cost_method'] ?? 'AVERAGE'));
            $payload['valuation_method'] = strtolower($payload['cost_method']) === 'fifo' ? 'fifo' : 'average';
            $payload['status'] = filter_var($payload['status'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $payload['unit'] = $payload['unit'] ?? 'pcs';

            $validator = Validator::make($payload, [
                'category_id' => ['required', 'integer', 'exists:categories,id'],
                'unit_id' => ['required', 'integer', 'exists:units,id'],
                'sku' => ['required', 'string', 'max:255'],
                'barcode' => ['nullable', 'string', 'max:255'],
                'name' => ['required', 'string', 'max:255'],
                'minimum_stock' => ['required', 'numeric', 'min:0'],
                'cost_method' => ['required', 'in:FIFO,AVERAGE'],
                'status' => ['sometimes', 'boolean'],
                'valuation_method' => ['required', 'in:average,fifo'],
                'unit' => ['sometimes', 'string', 'max:30'],
            ]);

            if ($validator->fails()) {
                $errors[] = [
                    'sku' => $payload['sku'] ?? null,
                    'errors' => $validator->errors()->toArray(),
                ];
                continue;
            }

            $product = Product::updateOrCreate(
                ['sku' => $payload['sku']],
                $validator->validated(),
            );

            $product->wasRecentlyCreated ? $created++ : $updated++;
        }

        fclose($handle);

        return response()->json([
            'message' => 'Import produk selesai.',
            'data' => compact('created', 'updated', 'errors'),
        ], empty($errors) ? 200 : 422);
    }

    public function export(Request $request): StreamedResponse
    {
        $filename = 'products-export-'.now()->format('YmdHis').'.csv';

        return response()->streamDownload(function () use ($request): void {
            $output = fopen('php://output', 'w');
            fputcsv($output, ['sku', 'barcode', 'name', 'category_id', 'unit_id', 'minimum_stock', 'cost_method', 'status']);

            Product::query()
                ->when($request->filled('category_id'), fn ($query) => $query->where('category_id', $request->integer('category_id')))
                ->orderBy('sku')
                ->cursor()
                ->each(function (Product $product) use ($output): void {
                    fputcsv($output, [
                        $product->sku,
                        $product->barcode,
                        $product->name,
                        $product->category_id,
                        $product->unit_id,
                        $product->minimum_stock,
                        $product->cost_method,
                        $product->status ? 1 : 0,
                    ]);
                });

            fclose($output);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function resolveProduct(string $product): Product
    {
        return Product::query()
            ->where('id', ctype_digit($product) ? (int) $product : 0)
            ->orWhere('barcode', $product)
            ->firstOrFail();
    }
}
