<?php

namespace Database\Factories;

use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Warehouse>
 */
class WarehouseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'WH-'.fake()->unique()->numerify('###'),
            'name' => fake()->unique()->company().' Warehouse',
            'address' => fake()->streetAddress(),
            'manager_name' => fake()->name(),
            'status' => true,
            'location' => fake()->city().', '.fake()->streetAddress(),
        ];
    }
}
