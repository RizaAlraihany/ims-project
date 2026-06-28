<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditTrailApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_and_logout_are_recorded_in_audit_logs(): void
    {
        $user = User::factory()->create([
            'email' => 'auditor@ims.test',
            'password' => Hash::make('password'),
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/login', [
            'email' => 'auditor@ims.test',
            'password' => 'password',
            'device_name' => 'audit-test',
        ])->assertOk()
            ->assertJsonMissingPath('data.token');

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'LOGIN',
            'table_name' => 'users',
            'record_id' => $user->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'LOGOUT',
            'table_name' => 'users',
            'record_id' => $user->id,
        ]);
    }

    public function test_mutating_api_requests_are_recorded_by_audit_middleware(): void
    {
        $user = $this->userWithRole('Super Admin');
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/categories', [
            'name' => 'Audit Category',
            'description' => 'Created from audit middleware test.',
        ])->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'CREATE',
            'table_name' => 'categories',
        ]);
    }

    public function test_audit_logs_can_be_listed_and_filtered(): void
    {
        $user = $this->userWithRole('Auditor');
        Sanctum::actingAs($user);

        $category = Category::factory()->create();
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'UPDATE',
            'table_name' => 'categories',
            'record_id' => $category->id,
            'old_values' => ['name' => 'Old'],
            'new_values' => ['name' => 'New'],
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);

        $this->getJson("/api/v1/audit-logs?user_id={$user->id}&action=UPDATE&date_from=".now()->toDateString())
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.items.0.user', $user->name)
            ->assertJsonPath('data.items.0.action', 'UPDATE')
            ->assertJsonPath('data.items.0.table_name', 'categories')
            ->assertJsonPath('data.items.0.record_id', $category->id)
            ->assertJsonPath('data.summary.total_rows', 1);
    }

    private function userWithRole(string $roleName): User
    {
        $this->seed(RolePermissionSeeder::class);

        return User::factory()->create([
            'role_id' => Role::where('name', $roleName)->firstOrFail()->id,
        ]);
    }
}
