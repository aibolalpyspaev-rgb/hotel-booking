<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Базовый Form Request: авторизация выполняется middleware (auth:sanctum, role:admin),
 * а здесь — только валидация данных.
 */
abstract class ApiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function attributes(): array
    {
        return [
            'name' => 'имя',
            'email' => 'email',
            'password' => 'пароль',
            'phone' => 'телефон',
            'city' => 'город',
            'address' => 'адрес',
            'description' => 'описание',
            'stars' => 'звёздность',
            'hotel_id' => 'отель',
            'room_id' => 'номер',
            'type' => 'тип номера',
            'price_per_night' => 'цена за ночь',
            'capacity' => 'вместимость',
            'check_in' => 'дата заезда',
            'check_out' => 'дата выезда',
            'guests' => 'количество гостей',
            'rating' => 'оценка',
            'comment' => 'комментарий',
            'message' => 'сообщение',
        ];
    }
}
