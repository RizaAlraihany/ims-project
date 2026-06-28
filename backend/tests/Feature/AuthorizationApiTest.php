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

        // Operator should not be able to view settings
        $response = $this->getJson('/api/v1/settings');

        $response->assertStatus(403);
        $response->assertJsonFragment(['message' => 'Anda tidak memiliki hak akses untuk aksi ini.']);
    }

    public function test_user_without_permission_cannot_approve_transfer(): void
    {
        $role = Role::where('name', 'Operator')->first();
        $user = User::factory()->create(['role_id' => $role->id, 'role' => 'Operator']);
        
        $this->actingAs($user, 'sanctum');

        $this->withoutMiddleware(\Illuminate\Routing\Middleware\SubstituteBindings::class);
        $response = $this->putJson('/api/v1/transfers/1/approve');
        $response->assertStatus(403);
    }

    public function test_user_without_permission_cannot_approve_opname(): void
    {
        $role = Role::where('name', 'Operator')->first();
        $user = User::factory()->create(['role_id' => $role->id, 'role' => 'Operator']);
        
        $this->actingAs($user, 'sanctum');

        $this->withoutMiddleware(\Illuminate\Routing\Middleware\SubstituteBindings::class);
        $response = $this->postJson('/api/v1/stock-opnames/1/approve');
        $response->assertStatus(403);
    }

    public function test_user_without_permission_cannot_update_role_permissions(): void
    {
        $role = Role::where('name', 'Operator')->first();
        $user = User::factory()->create(['role_id' => $role->id, 'role' => 'Operator']);
        
        $this->actingAs($user, 'sanctum');

        $response = $this->putJson('/api/v1/roles/1/permissions', ['permissions' => []]);
        $response->assertStatus(403);
    }

    public function test_user_without_permission_cannot_manage_users(): void
    {
        $role = Role::where('name', 'Operator')->first();
        $user = User::factory()->create(['role_id' => $role->id, 'role' => 'Operator']);
        
        $this->actingAs($user, 'sanctum');

        $this->postJson('/api/v1/users', [])->assertStatus(403);
        $this->putJson('/api/v1/users/1', [])->assertStatus(403);
        $this->deleteJson('/api/v1/users/1')->assertStatus(403);
    }

    public function test_user_with_view_user_permission_cannot_delete_users(): void
    {
        $viewerRole = Role::create([
            'name' => 'User Viewer',
            'description' => 'Can only view users.',
        ]);
        $viewerRole->permissions()->sync(
            \App\Models\Permission::where('code', 'user.view')->pluck('id')->all(),
        );

        $viewer = User::factory()->create(['role_id' => $viewerRole->id, 'role' => 'User Viewer']);
        $target = User::factory()->create();

        $this->actingAs($viewer, 'sanctum');

        $this->deleteJson("/api/v1/users/{$target->id}")->assertStatus(403);
    }

    public function test_user_with_permission_can_access_sensitive_endpoint(): void
    {
        $role = Role::where('name', 'Super Admin')->first();
        $user = User::factory()->create(['role_id' => $role->id, 'role' => 'Super Admin']);
        
        $this->actingAs($user, 'sanctum');

        // Super Admin can view settings
        $response = $this->getJson('/api/v1/settings');

        $response->assertStatus(200);
        $response->assertJsonStructure(['success', 'data']);
    }
}
