<?php

namespace App\Http\Requests\Booking;

use App\Enums\BookingStatus;
use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

class UpdateBookingStatusRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(BookingStatus::values())],
        ];
    }
}
