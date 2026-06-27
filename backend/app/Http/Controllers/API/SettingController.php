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
        $query = Setting::query()->orderBy('key');

        if (request()->user() && request()->user()->roleRecord?->name !== 'Super Admin') {
            $query->where('key', 'not like', 'security.%')
                  ->where('key', 'not like', 'api.%')
                  ->where('key', 'not like', 'backup.%');
        }

        return response()->json([
            'success' => true,
            'message' => 'Settings retrieved.',
            'data' => $query->get(['id', 'key', 'value']),
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
