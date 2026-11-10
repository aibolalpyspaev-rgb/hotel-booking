<?php

namespace Database\Seeders;

use App\Models\Amenity;
use Illuminate\Database\Seeder;

class AmenitySeeder extends Seeder
{
    /** Иконки — названия иконок lucide-react, используемые на фронтенде. */
    public const AMENITIES = [
        'Wi-Fi' => 'wifi',
        'Кондиционер' => 'wind',
        'Телевизор' => 'tv',
        'Завтрак включён' => 'coffee',
        'Парковка' => 'car',
        'Бассейн' => 'waves',
        'SPA' => 'sparkles',
        'Фитнес-зал' => 'dumbbell',
        'Трансфер из аэропорта' => 'plane',
        'Кухня' => 'utensils',
        'Мини-бар' => 'wine',
        'Вид на город' => 'building-2',
        'Можно с питомцами' => 'paw-print',
        'Рабочее место' => 'laptop',
    ];

    public function run(): void
    {
        foreach (self::AMENITIES as $name => $icon) {
            Amenity::create(['name' => $name, 'icon' => $icon]);
        }
    }
}
