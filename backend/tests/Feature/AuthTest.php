<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Иван Петров',
            'email' => 'ivan@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']])
            ->assertJsonPath('user.role', 'user');

        $user = User::where('email', 'ivan@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotEquals('secret123', $user->password, 'Пароль должен храниться в виде хеша');
        $this->assertTrue(Hash::check('secret123', $user->password));
    }

    public function test_registration_validation_errors(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/register', [
            'name' => '',
            'email' => 'taken@example.com',
            'password' => '123',
            'password_confirmation' => '456',
        ])->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_user_can_login_and_get_profile(): void
    {
        $user = User::factory()->create(['email' => 'user@example.com', 'password' => 'password1']);

        $token = $this->postJson('/api/login', ['email' => 'user@example.com', 'password' => 'password1'])
            ->assertOk()
            ->json('token');

        $this->withToken($token)->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create(['email' => 'user@example.com', 'password' => 'password1']);

        $this->postJson('/api/login', ['email' => 'user@example.com', 'password' => 'wrong-pass'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_guest_cannot_access_protected_routes(): void
    {
        $this->getJson('/api/user')->assertUnauthorized()->assertJsonPath('success', false);
        $this->getJson('/api/bookings')->assertUnauthorized();
    }

    public function test_user_can_logout(): void
    {
        User::factory()->create(['email' => 'user@example.com', 'password' => 'password1']);
        $token = $this->postJson('/api/login', ['email' => 'user@example.com', 'password' => 'password1'])->json('token');

        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
