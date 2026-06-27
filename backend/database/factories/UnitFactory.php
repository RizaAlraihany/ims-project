<?php

namespace Database\Factories;

use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    public function definition(): array
    {
        $symbol = strtoupper(fake()->unique()->bothify('U###'));

        return [
            'name' => 'Unit '.$symbol,
            'symbol' => $symbol,
        ];
    }
}
