<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();
        $this->room = Room::factory()->create(['price_per_night' => 20000, 'capacity' => 2]);
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'room_id' => $this->room->id,
            'check_in' => today()->addDays(10)->toDateString(),
            'check_out' => today()->addDays(13)->toDateString(),
            'guests' => 2,
        ], $override);
    }

    public function test_user_can_create_booking_with_correct_price(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/bookings', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.nights', 3)
            ->assertJsonPath('data.total_price', 60000)
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('bookings', ['user_id' => $user->id, 'room_id' => $this->room->id, 'total_price' => 60000]);
    }

    public function test_guest_cannot_book(): void
    {
        $this->postJson('/api/bookings', $this->payload())->assertUnauthorized();
    }

    public function test_room_cannot_be_double_booked_for_overlapping_dates(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();

        $this->actingAs($first)->postJson('/api/bookings', $this->payload())->assertCreated();

        // Пересекающиеся даты: 11–15 пересекается с 10–13
        $this->actingAs($second)->postJson('/api/bookings', $this->payload([
            'check_in' => today()->addDays(11)->toDateString(),
            'check_out' => today()->addDays(15)->toDateString(),
        ]))->assertStatus(409)->assertJsonPath('success', false);

        // Вложенный интервал 9–16 тоже занят
        $this->actingAs($second)->postJson('/api/bookings', $this->payload([
            'check_in' => today()->addDays(9)->toDateString(),
            'check_out' => today()->addDays(16)->toDateString(),
        ]))->assertStatus(409);

        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_checkout_day_can_be_checkin_day_of_next_guest(): void
    {
        $this->actingAs(User::factory()->create())->postJson('/api/bookings', $this->payload())->assertCreated();

        $this->actingAs(User::factory()->create())->postJson('/api/bookings', $this->payload([
            'check_in' => today()->addDays(13)->toDateString(),
            'check_out' => today()->addDays(15)->toDateString(),
        ]))->assertCreated();
    }

    public function test_cancelled_booking_frees_the_dates(): void
    {
        $user = User::factory()->create();
        $id = $this->actingAs($user)->postJson('/api/bookings', $this->payload())->json('data.id');

        $this->actingAs($user)->patchJson("/api/bookings/{$id}/cancel")
            ->assertOk()->assertJsonPath('data.status', 'cancelled');

        $this->actingAs(User::factory()->create())->postJson('/api/bookings', $this->payload())->assertCreated();
    }

    public function test_availability_endpoint_reports_occupied_room(): void
    {
        $this->actingAs(User::factory()->create())->postJson('/api/bookings', $this->payload())->assertCreated();

        $this->getJson("/api/rooms/{$this->room->id}/availability?check_in=".today()->addDays(12)->toDateString().'&check_out='.today()->addDays(14)->toDateString())
            ->assertOk()->assertJsonPath('data.available', false);

        $this->getJson("/api/rooms/{$this->room->id}/availability?check_in=".today()->addDays(20)->toDateString().'&check_out='.today()->addDays(22)->toDateString())
            ->assertOk()->assertJsonPath('data.available', true)->assertJsonPath('data.total_price', 40000);
    }

    public function test_booking_validation_errors(): void
    {
        $user = User::factory()->create();

        // Дата в прошлом и выезд раньше заезда
        $this->actingAs($user)->postJson('/api/bookings', $this->payload([
            'check_in' => today()->subDay()->toDateString(),
            'check_out' => today()->subDays(3)->toDateString(),
        ]))->assertStatus(422)->assertJsonValidationErrors(['check_in', 'check_out']);

        // Пустой запрос
        $this->actingAs($user)->postJson('/api/bookings', [])
            ->assertStatus(422)->assertJsonValidationErrors(['room_id', 'check_in', 'check_out', 'guests']);
    }

    public function test_guests_cannot_exceed_room_capacity(): void
    {
        $this->actingAs(User::factory()->create())
            ->postJson('/api/bookings', $this->payload(['guests' => 3]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['guests']);
    }

    public function test_user_cannot_see_or_cancel_foreign_booking(): void
    {
        $owner = User::factory()->create();
        $id = $this->actingAs($owner)->postJson('/api/bookings', $this->payload())->json('data.id');

        $stranger = User::factory()->create();
        $this->actingAs($stranger)->getJson("/api/bookings/{$id}")->assertForbidden();
        $this->actingAs($stranger)->patchJson("/api/bookings/{$id}/cancel")->assertForbidden();

        $this->assertSame('pending', Booking::find($id)->status->value);
    }

    public function test_user_can_confirm_and_list_own_bookings(): void
    {
        $user = User::factory()->create();
        $id = $this->actingAs($user)->postJson('/api/bookings', $this->payload())->json('data.id');

        $this->actingAs($user)->patchJson("/api/bookings/{$id}/confirm")
            ->assertOk()->assertJsonPath('data.status', 'confirmed');

        $this->actingAs($user)->getJson('/api/bookings')
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_can_change_booking_status(): void
    {
        $id = $this->actingAs(User::factory()->create())->postJson('/api/bookings', $this->payload())->json('data.id');
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->patchJson("/api/admin/bookings/{$id}/status", ['status' => 'confirmed'])
            ->assertOk()->assertJsonPath('data.status', 'confirmed');

        $this->actingAs($admin)->getJson('/api/admin/bookings')->assertOk()->assertJsonCount(1, 'data');
    }
}
