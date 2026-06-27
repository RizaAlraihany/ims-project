<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'unit_id' => Unit::factory(),
            'sku' => 'SKU-'.fake()->unique()->bothify('????-####'),
            'barcode' => fake()->unique()->ean13(),
            'name' => fake()->words(3, true),
            'minimum_stock' => fake()->numberBetween(5, 50),
            'average_cost' => fake()->randomFloat(2, 5_000, 2_500_000),
            'cost_method' => fake()->randomElement(['AVERAGE', 'FIFO']),
            'status' => true,
            'valuation_method' => fake()->randomElement(['average', 'fifo']),
            'unit' => fake()->randomElement(['pcs', 'box', 'kg', 'pack', 'unit']),
        ];
    }

    public function fifo(): static
    {
        return $this->state(fn (array $attributes) => [
            'valuation_method' => 'fifo',
            'cost_method' => 'FIFO',
        ]);
    }

    public function average(): static
    {
        return $this->state(fn (array $attributes) => [
            'valuation_method' => 'average',
            'cost_method' => 'AVERAGE',
        ]);
    }
}
