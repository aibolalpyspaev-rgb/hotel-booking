<?php

namespace Database\Seeders;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Booking;
use App\Models\Review;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Примеры бронирований (прошедшие, текущие, будущие, отменённые) и отзывов.
 * Даты считаются от текущего дня, поэтому данные всегда выглядят актуально.
 */
class BookingSeeder extends Seeder
{
    private const COMMENTS = [
        5 => [
            'Прекрасный отель! Чистые номера, вежливый персонал, отличный завтрак. Обязательно вернёмся.',
            'Всё на высшем уровне: расположение, сервис, вид из окна. Рекомендую всем!',
            'Останавливались семьёй — детям очень понравился бассейн, а нам — тишина и комфорт.',
        ],
        4 => [
            'Хороший отель за свои деньги. Немного шумно вечером, но в целом всё понравилось.',
            'Удобное расположение и приятный персонал. Завтрак мог бы быть разнообразнее.',
            'Чисто и уютно, быстрый Wi-Fi. Заселили даже раньше времени — спасибо!',
        ],
        3 => [
            'Нормально для одной ночи. Номер небольшой, но всё необходимое есть.',
        ],
    ];

    public function run(): void
    {
        mt_srand(42);
        $users = User::where('role', UserRole::User)->get();
        $rooms = Room::with('hotel')->get();
        $today = today();

        // 1. Завершённые проживания (в прошлом) + отзывы
        foreach ($rooms as $i => $room) {
            foreach ([1, 2] as $k) {
                if ($k === 2 && $i % 2 === 1) {
                    continue;
                }
                $user = $users[($i + $k) % $users->count()];
                $checkIn = $today->copy()->subDays(10 + ($i * 7 + $k * 23) % 150);
                $nights = 1 + ($i + $k) % 4;
                $booking = $this->make($user, $room, $checkIn, $nights, BookingStatus::Completed, $checkIn->copy()->subDays(14));

                if (($i + $k) % 3 !== 0) {
                    $rating = [5, 4, 5, 4, 3, 5][($i + $k) % 6];
                    $variants = self::COMMENTS[$rating];
                    $review = Review::create([
                        'user_id' => $user->id,
                        'hotel_id' => $room->hotel_id,
                        'booking_id' => $booking->id,
                        'rating' => $rating,
                        'comment' => $variants[($i + $k) % count($variants)],
                    ]);
                    $review->timestamps = false;
                    $review->forceFill(['created_at' => $booking->check_out->copy()->addDay(), 'updated_at' => $booking->check_out->copy()->addDay()])->save();
                }
            }
        }

        // 2. Будущие подтверждённые и ожидающие бронирования
        foreach ($rooms->take(14) as $i => $room) {
            $user = $users[$i % $users->count()];
            $checkIn = $today->copy()->addDays(3 + ($i * 5) % 40);
            $status = $i % 3 === 0 ? BookingStatus::Pending : BookingStatus::Confirmed;
            $this->make($user, $room, $checkIn, 2 + $i % 3, $status, $today->copy()->subDays($i % 10));
        }

        // 3. Отменённые
        foreach ($rooms->slice(3, 4) as $i => $room) {
            $user = $users[($i + 2) % $users->count()];
            $checkIn = $today->copy()->addDays(20 + $i);
            $this->make($user, $room, $checkIn, 2, BookingStatus::Cancelled, $today->copy()->subDays(20 + $i));
        }

        // 4. Демо-пользователь: проживание завершено, но отзыв ещё не оставлен (можно показать на защите)
        $demo = User::where('email', 'user@hotel.kz')->first();
        $room = $rooms->firstWhere('hotel.city', 'Шымкент');
        $this->make($demo, $room, $today->copy()->subDays(6), 3, BookingStatus::Completed, $today->copy()->subDays(20));
    }

    private function make(User $user, Room $room, $checkIn, int $nights, BookingStatus $status, $createdAt): Booking
    {
        $checkOut = $checkIn->copy()->addDays($nights);
        $guests = max(1, min($room->capacity, 1 + $nights % 2));

        $booking = new Booking([
            'code' => 'HB-'.strtoupper(Str::random(6)),
            'user_id' => $user->id,
            'room_id' => $room->id,
            'check_in' => $checkIn->toDateString(),
            'check_out' => $checkOut->toDateString(),
            'guests' => $guests,
            'nights' => $nights,
            'price_per_night' => $room->price_per_night,
            'total_price' => $room->price_per_night * $nights,
            'status' => $status,
            'guest_name' => $user->name,
            'guest_phone' => $user->phone,
            'confirmed_at' => in_array($status, [BookingStatus::Confirmed, BookingStatus::Completed]) ? $createdAt : null,
            'cancelled_at' => $status === BookingStatus::Cancelled ? $createdAt->copy()->addDay() : null,
        ]);
        $booking->created_at = $createdAt;
        $booking->updated_at = $createdAt;
        $booking->save();

        return $booking;
    }
}
