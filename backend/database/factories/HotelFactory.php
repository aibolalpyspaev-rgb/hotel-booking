<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Hotel>
 */
class HotelFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Hotel '.fake()->unique()->word(),
            'city' => fake()->randomElement(['Астана', 'Алматы', 'Шымкент']),
            'address' => fake()->streetAddress(),
            'description' => fake()->paragraph(3),
            'stars' => fake()->numberBetween(2, 5),
            'rating' => 0,
            'image_url' => 'https://example.com/hotel.jpg',
            'is_active' => true,
        ];
    }
}
