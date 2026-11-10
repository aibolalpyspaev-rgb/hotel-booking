<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Администратор',
            'email' => 'admin@hotel.kz',
            'phone' => '+7 700 000 00 01',
            'password' => 'admin123',
            'role' => UserRole::Admin,
        ]);

        User::create([
            'name' => 'Айгерим Нурланова',
            'email' => 'user@hotel.kz',
            'phone' => '+7 701 111 22 33',
            'password' => 'user1234',
            'role' => UserRole::User,
        ]);

        $people = [
            ['Ерлан Сапаров', 'erlan@mail.kz'],
            ['Дана Ахметова', 'dana@mail.kz'],
            ['Тимур Касымов', 'timur@mail.kz'],
            ['Мадина Оспанова', 'madina@mail.kz'],
            ['Алексей Иванов', 'alexey@mail.kz'],
            ['Асель Жумабаева', 'asel@mail.kz'],
        ];

        foreach ($people as $i => [$name, $email]) {
            User::create([
                'name' => $name,
                'email' => $email,
                'phone' => '+7 70'.($i + 2).' 555 00 '.str_pad((string) ($i + 10), 2, '0', STR_PAD_LEFT),
                'password' => 'user1234',
                'role' => UserRole::User,
            ]);
        }
    }
}
