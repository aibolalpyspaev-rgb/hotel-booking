<?php

namespace Tests\Feature;

use App\Models\Hotel;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_assistant_asks_budget_and_returns_real_hotels(): void
    {
        config(['services.anthropic.key' => null]);

        $cheap = Hotel::factory()->create(['city' => 'Астана', 'name' => 'Cheap Inn']);
        Room::factory()->for($cheap)->create(['price_per_night' => 18000, 'capacity' => 2]);
        $lux = Hotel::factory()->create(['city' => 'Астана', 'name' => 'Lux Palace']);
        Room::factory()->for($lux)->create(['price_per_night' => 90000, 'capacity' => 2]);

        $first = $this->postJson('/api/chat', ['message' => 'Мне нужен недорогой отель в Астане на двоих'])
            ->assertOk()
            ->json('data');

        $this->assertStringContainsString('бюджет', $first['reply']);
        $this->assertEmpty($first['hotels']);

        $second = $this->postJson('/api/chat', ['message' => 'До 25000 тенге', 'session_id' => $first['session_id']])
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $second['hotels']);
        $this->assertSame('Cheap Inn', $second['hotels'][0]['name']);
        $this->assertSame(18000, $second['hotels'][0]['min_price']);
    }

    public function test_assistant_explains_cancellation_rules(): void
    {
        $reply = $this->postJson('/api/chat', ['message' => 'Как отменить бронирование?'])->assertOk()->json('data.reply');

        $this->assertStringContainsString('отмен', mb_strtolower($reply));
    }

    public function test_chat_validation(): void
    {
        $this->postJson('/api/chat', ['message' => ''])->assertStatus(422)->assertJsonValidationErrors(['message']);
    }
}
