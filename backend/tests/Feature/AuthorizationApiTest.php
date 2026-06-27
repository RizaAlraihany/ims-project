<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    public function test_user_without_permission_cannot_access_sensitive_endpoint(): void
    {
        $role = Role::where('name', 'Operator')->first();
        $user = User::factory()->create(['role_id' => $role->id, 'role' => 'Operator']);
        
        $this->actingAs($user, 'sanctum');

        // Staff Gudang should not be able to view settings
        $response = $this->getJson('/api/settings');

        $response->assertStatus(403);
        $response->assertJsonFragment(['message' => 'Anda tidak memiliki hak akses untuk aksi ini.']);
    }

    public function test_user_with_permission_can_access_sensitive_endpoint(): void
    {
        $role = Role::where('name', 'Super Admin')->first();
        $user = User::factory()->create(['role_id' => $role->id, 'role' => 'Super Admin']);
        
        $this->actingAs($user, 'sanctum');

        // Super Admin can view settings
        $response = $this->getJson('/api/settings');

        $response->assertStatus(200);
        $response->assertJsonStructure(['success', 'data']);
    }
}
