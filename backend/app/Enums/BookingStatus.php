<?php

namespace App\Enums;

enum BookingStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Completed = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Ожидает подтверждения',
            self::Confirmed => 'Подтверждено',
            self::Cancelled => 'Отменено',
            self::Completed => 'Завершено',
        };
    }

    /** Статусы, при которых номер считается занятым на даты брони. */
    public static function blocking(): array
    {
        return [self::Pending->value, self::Confirmed->value];
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
