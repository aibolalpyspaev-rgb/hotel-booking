<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Exceptions\BusinessException;
use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Вся бизнес-логика бронирования: расчёт стоимости, проверка занятости,
 * создание брони в транзакции с блокировкой, подтверждение, отмена, смена статусов.
 */
class BookingService
{
    public const MAX_NIGHTS = 30;

    /** Расчёт стоимости проживания. */
    public function quote(Room $room, string $checkIn, string $checkOut): array
    {
        [$in, $out] = $this->parseDates($checkIn, $checkOut);
        $nights = (int) $in->diffInDays($out);

        return [
            'room_id' => $room->id,
            'check_in' => $in->toDateString(),
            'check_out' => $out->toDateString(),
            'nights' => $nights,
            'price_per_night' => $room->price_per_night,
            'total_price' => $nights * $room->price_per_night,
            'available' => $this->isAvailable($room, $in->toDateString(), $out->toDateString()),
        ];
    }

    /**
     * Свободен ли номер. Пересечение интервалов:
     * существующая.check_in < новая.check_out И существующая.check_out > новая.check_in
     * (день выезда одного гостя может быть днём заезда другого).
     */
    public function isAvailable(Room $room, string $checkIn, string $checkOut, ?int $exceptBookingId = null): bool
    {
        return ! $this->overlappingQuery($room->id, $checkIn, $checkOut, $exceptBookingId)->exists();
    }

    /** Занятые интервалы номера (для календаря на фронтенде). */
    public function occupiedRanges(Room $room): array
    {
        return $room->bookings()
            ->whereIn('status', BookingStatus::blocking())
            ->where('check_out', '>', today()->toDateString())
            ->orderBy('check_in')
            ->get(['check_in', 'check_out'])
            ->map(fn (Booking $b) => [
                'check_in' => $b->check_in->toDateString(),
                'check_out' => $b->check_out->toDateString(),
            ])->all();
    }

    /**
     * Создание бронирования.
     * DB::transaction + SELECT ... FOR UPDATE по строке номера гарантирует,
     * что два одновременных запроса на один номер выполнятся строго по очереди,
     * и второй увидит бронь первого.
     */
    public function create(User $user, array $data): Booking
    {
        [$in, $out] = $this->parseDates($data['check_in'], $data['check_out']);
        $guests = (int) $data['guests'];

        return DB::transaction(function () use ($user, $data, $in, $out, $guests) {
            /** @var Room|null $room */
            $room = Room::query()->with('hotel')->lockForUpdate()->find($data['room_id']);

            if (! $room || ! $room->is_active || ! $room->hotel?->is_active) {
                throw new BusinessException('Номер недоступен для бронирования.', 422);
            }

            if ($guests > $room->capacity) {
                throw new BusinessException(
                    "Количество гостей превышает вместимость номера (максимум {$room->capacity}).",
                    422,
                    ['guests' => ["Максимальная вместимость номера — {$room->capacity} чел."]]
                );
            }

            $checkIn = $in->toDateString();
            $checkOut = $out->toDateString();

            // Дублирующая бронь того же пользователя
            $duplicate = Booking::query()
                ->where('user_id', $user->id)
                ->where('room_id', $room->id)
                ->where('check_in', $checkIn)
                ->where('check_out', $checkOut)
                ->whereIn('status', BookingStatus::blocking())
                ->exists();

            if ($duplicate) {
                throw new BusinessException('У вас уже есть бронирование этого номера на эти даты.', 409);
            }

            if ($this->overlappingQuery($room->id, $checkIn, $checkOut)->lockForUpdate()->exists()) {
                throw new BusinessException(
                    'Номер уже забронирован на выбранные даты. Выберите другие даты или другой номер.',
                    409,
                    ['check_in' => ['Даты пересекаются с существующим бронированием.']]
                );
            }

            $nights = (int) $in->diffInDays($out);

            return Booking::create([
                'code' => $this->generateCode(),
                'user_id' => $user->id,
                'room_id' => $room->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guests' => $guests,
                'nights' => $nights,
                'price_per_night' => $room->price_per_night,
                'total_price' => $nights * $room->price_per_night,
                'status' => BookingStatus::Pending,
                'guest_name' => $data['guest_name'] ?? $user->name,
                'guest_phone' => $data['guest_phone'] ?? $user->phone,
                'special_requests' => $data['special_requests'] ?? null,
            ]);
        }, 3);
    }

    /** Имитация оплаты: pending → confirmed. */
    public function confirm(Booking $booking): Booking
    {
        if ($booking->status !== BookingStatus::Pending) {
            throw new BusinessException('Подтвердить можно только бронирование в статусе «Ожидает подтверждения».', 422);
        }

        $booking->update(['status' => BookingStatus::Confirmed, 'confirmed_at' => now()]);

        return $booking;
    }

    /** Отмена бронирования пользователем (или администратором). */
    public function cancel(Booking $booking, User $actor): Booking
    {
        if (! in_array($booking->status->value, BookingStatus::blocking(), true)) {
            throw new BusinessException('Это бронирование уже нельзя отменить (статус: '.$booking->status->label().').', 422);
        }

        if (! $actor->isAdmin() && ! $booking->check_in->isAfter(today())) {
            throw new BusinessException('Бесплатная отмена возможна не позднее чем за сутки до даты заезда.', 422);
        }

        $booking->update(['status' => BookingStatus::Cancelled, 'cancelled_at' => now()]);

        return $booking;
    }

    /** Смена статуса администратором с проверкой допустимых переходов. */
    public function changeStatus(Booking $booking, BookingStatus $status): Booking
    {
        if ($booking->status === $status) {
            return $booking;
        }

        $allowed = match ($booking->status) {
            BookingStatus::Pending => [BookingStatus::Confirmed, BookingStatus::Cancelled],
            BookingStatus::Confirmed => [BookingStatus::Completed, BookingStatus::Cancelled, BookingStatus::Pending],
            BookingStatus::Cancelled => [BookingStatus::Pending, BookingStatus::Confirmed],
            BookingStatus::Completed => [],
        };

        if (! in_array($status, $allowed, true)) {
            throw new BusinessException(
                "Нельзя перевести бронирование из статуса «{$booking->status->label()}» в «{$status->label()}».",
                422
            );
        }

        return DB::transaction(function () use ($booking, $status) {
            // Восстановление отменённой брони: номер мог быть занят другим гостем
            if ($booking->status === BookingStatus::Cancelled) {
                Room::query()->lockForUpdate()->find($booking->room_id);
                $busy = $this->overlappingQuery(
                    $booking->room_id,
                    $booking->check_in->toDateString(),
                    $booking->check_out->toDateString(),
                    $booking->id
                )->exists();

                if ($busy) {
                    throw new BusinessException('Нельзя восстановить бронь: номер уже занят на эти даты.', 409);
                }
            }

            $booking->status = $status;
            if ($status === BookingStatus::Confirmed) {
                $booking->confirmed_at = now();
            }
            if ($status === BookingStatus::Cancelled) {
                $booking->cancelled_at = now();
            }
            $booking->save();

            return $booking;
        });
    }

    /** Автоматически завершает подтверждённые брони, у которых прошла дата выезда. */
    public function completeFinished(): int
    {
        return Booking::query()
            ->where('status', BookingStatus::Confirmed)
            ->where('check_out', '<=', today()->toDateString())
            ->update(['status' => BookingStatus::Completed->value, 'updated_at' => now()]);
    }

    public function listForUser(User $user, array $filters = []): LengthAwarePaginator
    {
        $this->completeFinished();

        return Booking::query()
            ->where('user_id', $user->id)
            ->with(['room.hotel', 'review'])
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(min((int) ($filters['per_page'] ?? 10), 50));
    }

    public function listAll(array $filters = []): LengthAwarePaginator
    {
        $this->completeFinished();

        return Booking::query()
            ->with(['room.hotel', 'user'])
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($filters['hotel_id'] ?? null, fn ($q, $id) => $q->whereHas('room', fn ($r) => $r->where('hotel_id', $id)))
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('code', 'like', "%{$search}%")
                        ->orWhere('guest_name', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate(min((int) ($filters['per_page'] ?? 15), 100));
    }

    private function overlappingQuery(int $roomId, string $checkIn, string $checkOut, ?int $exceptId = null)
    {
        return Booking::query()
            ->where('room_id', $roomId)
            ->whereIn('status', BookingStatus::blocking())
            ->where('check_in', '<', $checkOut)
            ->where('check_out', '>', $checkIn)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId));
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function parseDates(string $checkIn, string $checkOut): array
    {
        $in = CarbonImmutable::parse($checkIn)->startOfDay();
        $out = CarbonImmutable::parse($checkOut)->startOfDay();

        if ($in->lt(today())) {
            throw new BusinessException('Дата заезда не может быть в прошлом.', 422, ['check_in' => ['Дата заезда не может быть в прошлом.']]);
        }
        if ($out->lte($in)) {
            throw new BusinessException('Дата выезда должна быть позже даты заезда.', 422, ['check_out' => ['Дата выезда должна быть позже даты заезда.']]);
        }
        if ($in->diffInDays($out) > self::MAX_NIGHTS) {
            throw new BusinessException('Максимальный срок бронирования — '.self::MAX_NIGHTS.' ночей.', 422);
        }

        return [$in, $out];
    }

    private function generateCode(): string
    {
        do {
            $code = 'HB-'.strtoupper(Str::random(6));
        } while (Booking::where('code', $code)->exists());

        return $code;
    }
}
