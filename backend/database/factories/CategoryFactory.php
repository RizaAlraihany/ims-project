<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Elektronik',
                'Sembako',
                'Alat Tulis',
                'Perlengkapan Gudang',
                'Produk Kebersihan',
                'Sparepart',
            ]).'-'.fake()->unique()->numberBetween(100, 999),
            'description' => fake()->sentence(),
        ];
    }
}
