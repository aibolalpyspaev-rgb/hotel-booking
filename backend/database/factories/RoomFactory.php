<?php

namespace Database\Factories;

use App\Models\Hotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Room>
 */
class RoomFactory extends Factory
{
    public function definition(): array
    {
        return [
            'hotel_id' => Hotel::factory(),
            'name' => 'Номер '.fake()->numberBetween(100, 999),
            'type' => 'standard',
            'description' => fake()->sentence(),
            'price_per_night' => 20000,
            'capacity' => 2,
            'beds' => 1,
            'area' => 25,
            'is_active' => true,
        ];
    }
}
