<?php

namespace App\Enums;

enum RoomType: string
{
    case Standard = 'standard';
    case Comfort = 'comfort';
    case Deluxe = 'deluxe';
    case Suite = 'suite';
    case Family = 'family';

    public function label(): string
    {
        return match ($this) {
            self::Standard => 'Стандарт',
            self::Comfort => 'Комфорт',
            self::Deluxe => 'Делюкс',
            self::Suite => 'Люкс',
            self::Family => 'Семейный',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
