<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_v1_auth_contract_returns_session_user_role_and_permissions(): void
    {
        $this->seed();

        $loginResponse = $this
            ->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/login', [
            'email' => 'admin@ims.test',
            'password' => 'password',
            'device_name' => 'feature-test',
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'Super Admin')
            ->assertJsonPath('data.user.permissions.0', 'product.view')
            ->assertJsonMissingPath('data.token');

        $this->withHeader('Origin', 'http://localhost:5173')
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'admin@ims.test')
            ->assertJsonPath('data.user.role', 'Super Admin');

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'inactive@ims.test',
            'password' => Hash::make('password'),
            'is_active' => false,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@ims.test',
            'password' => 'password',
        ])->assertUnprocessable();
    }
}
