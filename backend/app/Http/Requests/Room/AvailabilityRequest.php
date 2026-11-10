<?php

namespace App\Http\Requests\Room;

use App\Http\Requests\ApiRequest;

class AvailabilityRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'check_in' => ['required', 'date', 'after_or_equal:today'],
            'check_out' => ['required', 'date', 'after:check_in'],
        ];
    }

    public function messages(): array
    {
        return [
            'check_in.after_or_equal' => 'Дата заезда не может быть в прошлом.',
            'check_out.after' => 'Дата выезда должна быть позже даты заезда.',
        ];
    }
}
