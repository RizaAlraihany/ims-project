<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\SettingsUpdateRequest;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Settings retrieved.',
            'data' => Setting::query()
                ->orderBy('key')
                ->get(['id', 'key', 'value']),
        ]);
    }

    public function update(SettingsUpdateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $settings = collect($validated['settings'])
            ->map(fn (array $setting) => Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'] ?? null],
            ))
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Settings berhasil diperbarui.',
            'data' => $settings,
        ]);
    }
}
