<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /** @return array{user: User, token: string} */
    public function register(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => mb_strtolower($data['email']),
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'], // хешируется кастом 'hashed' в модели
            'role' => UserRole::User,
        ]);

        return ['user' => $user, 'token' => $user->createToken('spa')->plainTextToken];
    }

    /** @return array{user: User, token: string} */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', mb_strtolower($email))->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Неверный email или пароль.'],
            ]);
        }

        return ['user' => $user, 'token' => $user->createToken('spa')->plainTextToken];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    public function updateProfile(User $user, array $data): User
    {
        $user->update(array_filter([
            'name' => $data['name'] ?? null,
            'email' => isset($data['email']) ? mb_strtolower($data['email']) : null,
            'phone' => $data['phone'] ?? null,
        ], fn ($v) => $v !== null));

        if (! empty($data['password'])) {
            if (! Hash::check($data['current_password'] ?? '', $user->password)) {
                throw ValidationException::withMessages(['current_password' => ['Текущий пароль указан неверно.']]);
            }
            $user->update(['password' => $data['password']]);
        }

        return $user->fresh();
    }
}
