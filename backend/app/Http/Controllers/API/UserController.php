<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\UserManagementRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->with('roleRecord:id,name,description')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhereHas('roleRecord', fn ($query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($request->filled('role_id'), fn ($query) => $query->where('role_id', $request->integer('role_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('is_active', $request->string('status')->toString() === 'active'))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($users);
    }

    public function store(UserManagementRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $payload['is_active'] = $payload['is_active'] ?? true;

        $user = User::create($payload);

        return response()->json([
            'success' => true,
            'message' => 'User berhasil dibuat.',
            'data' => $user->load('roleRecord:id,name,description'),
        ], 201);
    }

    public function update(UserManagementRequest $request, User $user): JsonResponse
    {
        $payload = $request->validated();

        if (blank($payload['password'] ?? null)) {
            unset($payload['password']);
        }

        $user->update($payload);

        return response()->json([
            'success' => true,
            'message' => 'User berhasil diperbarui.',
            'data' => $user->load('roleRecord:id,name,description'),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()?->hasPermissionTo('user.delete'), 403, 'Permission Denied');

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User berhasil dinonaktifkan.',
        ]);
    }
}
