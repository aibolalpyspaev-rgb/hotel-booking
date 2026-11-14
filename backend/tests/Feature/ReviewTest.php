<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private function completedBooking(User $user, string $status = 'completed'): Booking
    {
        $room = Room::factory()->create();

        return Booking::create([
            'code' => 'HB-'.strtoupper(fake()->bothify('??####')),
            'user_id' => $user->id,
            'room_id' => $room->id,
            'check_in' => today()->subDays(5),
            'check_out' => today()->subDays(2),
            'guests' => 2,
            'nights' => 3,
            'price_per_night' => 20000,
            'total_price' => 60000,
            'status' => $status,
        ]);
    }

    public function test_user_can_review_after_stay_and_rating_is_recalculated(): void
    {
        $user = User::factory()->create();
        $booking = $this->completedBooking($user);

        $this->actingAs($user)->postJson('/api/reviews', [
            'booking_id' => $booking->id,
            'rating' => 4,
            'comment' => 'Отличный отель, всё понравилось!',
        ])->assertCreated();

        $this->assertEquals(4.0, $booking->room->hotel->fresh()->rating);

        // Повторный отзыв на ту же бронь запрещён
        $this->actingAs($user)->postJson('/api/reviews', [
            'booking_id' => $booking->id, 'rating' => 5, 'comment' => 'Второй отзыв на ту же бронь',
        ])->assertStatus(409);
    }

    public function test_cannot_review_foreign_or_unfinished_booking(): void
    {
        $owner = User::factory()->create();
        $booking = $this->completedBooking($owner);

        $this->actingAs(User::factory()->create())->postJson('/api/reviews', [
            'booking_id' => $booking->id, 'rating' => 5, 'comment' => 'Чужая бронь, так нельзя',
        ])->assertForbidden();

        $pending = $this->completedBooking($owner, 'cancelled');
        $this->actingAs($owner)->postJson('/api/reviews', [
            'booking_id' => $pending->id, 'rating' => 5, 'comment' => 'Отменённая бронь, так нельзя',
        ])->assertStatus(422);
    }
}
