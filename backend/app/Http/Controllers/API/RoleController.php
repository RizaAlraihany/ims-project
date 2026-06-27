<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\RolePermissionSyncRequest;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Roles retrieved.',
            'data' => Role::query()
                ->with('permissions:id,code,name')
                ->withCount('users')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function permissions(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Permissions retrieved.',
            'data' => Permission::query()
                ->orderBy('code')
                ->get(['id', 'code', 'name']),
        ]);
    }

    public function syncPermissions(RolePermissionSyncRequest $request, Role $role): JsonResponse
    {
        $validated = $request->validated();

        $role->permissions()->sync($validated['permission_ids']);

        return response()->json([
            'success' => true,
            'message' => 'Permission role berhasil diperbarui.',
            'data' => $role->load('permissions:id,code,name'),
        ]);
    }
}
