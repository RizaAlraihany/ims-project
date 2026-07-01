<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\LoginRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request, AuditService $auditService): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password tidak valid.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Akun tidak aktif. Hubungi administrator.'],
            ]);
        }

        // Delete old tokens and create a new Sanctum token (cross-domain compatible)
        $user->tokens()->delete();
        $token = $user->createToken($request->input('device_name', 'ims-frontend'))->plainTextToken;

        $userData = $this->userPayload($user);
        $auditService->log($user, 'LOGIN', 'users', $user->id, null, ['email' => $user->email], $request->ip());

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data' => [
                'user' => $userData,
                'token' => $token,
            ],
            'user' => $userData,
            'token' => $token,
        ]);
    }

    public function logout(Request $request, AuditService $auditService): JsonResponse
    {
        $user = $request->user();
        $auditService->log($user, 'LOGOUT', 'users', $user?->id, null, ['email' => $user?->email], $request->ip());
        
        // Revoke current token
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
            'data' => null,
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        $userData = $this->userPayload($request->user());

        return response()->json([
            'success' => true,
            'message' => 'Success',
            'data' => [
                'user' => $userData,
            ],
            'user' => $userData,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        $user->loadMissing('roleRecord.permissions');
        $roleName = $user->roleRecord?->name ?? $user->role;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $roleName,
            'legacy_role' => $user->role,
            'permissions' => $user->permissionCodes(),
        ];
    }
}
