<?php

namespace App\Http\Requests\Booking;

use App\Http\Requests\ApiRequest;

class StoreBookingRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'check_in' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'check_out' => ['required', 'date_format:Y-m-d', 'after:check_in'],
            'guests' => ['required', 'integer', 'between:1,10'],
            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'regex:/^\+?[0-9\s\-()]{10,20}$/'],
            'special_requests' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'check_in.after_or_equal' => 'Дата заезда не может быть в прошлом.',
            'check_out.after' => 'Дата выезда должна быть позже даты заезда.',
            'guest_phone.regex' => 'Укажите телефон в формате +7 700 000 00 00.',
        ];
    }
}
