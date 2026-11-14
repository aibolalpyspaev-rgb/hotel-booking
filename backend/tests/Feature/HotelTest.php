<?php

namespace Tests\Feature;

use App\Models\Hotel;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HotelTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_view_hotels_list(): void
    {
        Hotel::factory()->count(3)->has(Room::factory()->count(2))->create();

        $this->getJson('/api/hotels')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure(['data' => [['id', 'name', 'city', 'stars', 'rating', 'min_price']], 'meta' => ['total', 'current_page']]);
    }

    public function test_hotels_can_be_filtered_by_city_price_and_guests(): void
    {
        $astana = Hotel::factory()->create(['city' => 'Астана']);
        Room::factory()->for($astana)->create(['price_per_night' => 15000, 'capacity' => 2]);
        $almaty = Hotel::factory()->create(['city' => 'Алматы']);
        Room::factory()->for($almaty)->create(['price_per_night' => 50000, 'capacity' => 2]);

        $this->getJson('/api/hotels?city=Астана')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $astana->id);
        $this->getJson('/api/hotels?max_price=20000')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $astana->id);
        $this->getJson('/api/hotels?guests=4')->assertJsonCount(0, 'data');
    }

    public function test_guest_can_view_single_hotel_with_rooms(): void
    {
        $hotel = Hotel::factory()->has(Room::factory()->count(2))->create();

        $this->getJson("/api/hotels/{$hotel->id}")
            ->assertOk()
            ->assertJsonPath('data.name', $hotel->name)
            ->assertJsonCount(2, 'data.rooms');
    }

    public function test_missing_hotel_returns_404_in_unified_format(): void
    {
        $this->getJson('/api/hotels/9999')->assertNotFound()->assertJson(['success' => false]);
    }

    public function test_regular_user_cannot_create_hotel(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/hotels', ['name' => 'Test'])->assertForbidden();
    }

    public function test_admin_can_create_update_and_delete_hotel(): void
    {
        $admin = User::factory()->admin()->create();

        $id = $this->actingAs($admin)->postJson('/api/hotels', [
            'name' => 'Новый отель',
            'city' => 'Астана',
            'address' => 'ул. Тестовая, 1',
            'description' => 'Описание нового отеля для теста.',
            'stars' => 4,
        ])->assertCreated()->json('data.id');

        $this->actingAs($admin)->putJson("/api/hotels/{$id}", ['stars' => 5])
            ->assertOk()->assertJsonPath('data.stars', 5);

        $this->actingAs($admin)->deleteJson("/api/hotels/{$id}")->assertOk();
        $this->assertDatabaseMissing('hotels', ['id' => $id]);
    }

    public function test_admin_hotel_validation(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/hotels', ['stars' => 9])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'city', 'address', 'description', 'stars']);
    }

    public function test_admin_routes_are_protected(): void
    {
        $this->getJson('/api/admin/stats')->assertUnauthorized();
        $this->actingAs(User::factory()->create())->getJson('/api/admin/stats')->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->getJson('/api/admin/stats')
            ->assertOk()->assertJsonStructure(['data' => ['totals' => ['hotels', 'rooms', 'bookings', 'users', 'active_bookings']]]);
    }
}
