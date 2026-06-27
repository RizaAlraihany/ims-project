<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\UnitRequest;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $units = Unit::query()
            ->withCount('products')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();

                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('symbol', 'like', "%{$search}%");
            })
            ->orderBy('symbol')
            ->paginate($request->integer('per_page', 15));

        return response()->json($units);
    }

    public function store(UnitRequest $request): JsonResponse
    {
        $unit = Unit::create($request->validated());

        return response()->json([
            'message' => 'Unit berhasil dibuat.',
            'data' => $unit,
        ], 201);
    }

    public function show(Unit $unit): JsonResponse
    {
        return response()->json([
            'data' => $unit->loadCount('products'),
        ]);
    }

    public function update(UnitRequest $request, Unit $unit): JsonResponse
    {
        $unit->update($request->validated());

        return response()->json([
            'message' => 'Unit berhasil diperbarui.',
            'data' => $unit,
        ]);
    }

    public function destroy(Unit $unit): JsonResponse
    {
        if ($unit->products()->exists()) {
            return response()->json([
                'message' => 'Unit tidak dapat dihapus karena masih digunakan produk.',
            ], 422);
        }

        $unit->delete();

        return response()->json([
            'message' => 'Unit berhasil dihapus.',
        ]);
    }
}
