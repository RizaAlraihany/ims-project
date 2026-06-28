<?php

namespace Tests;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    protected function actingAsRole(string $roleName = 'Super Admin'): User
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create([
            'role_id' => Role::where('name', $roleName)->firstOrFail()->id,
        ]);

        Sanctum::actingAs($user);

        return $user;
    }
}
