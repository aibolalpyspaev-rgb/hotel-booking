<?php

namespace App\Http\Requests\Room;

use App\Enums\RoomType;
use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

class RoomIndexRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'hotel_id' => ['nullable', 'integer'],
            'type' => ['nullable', Rule::in(RoomType::values())],
            'city' => ['nullable', 'string', 'max:100'],
            'search' => ['nullable', 'string', 'max:100'],
            'guests' => ['nullable', 'integer', 'between:1,10'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0'],
            'check_in' => ['nullable', 'date', 'after_or_equal:today', 'required_with:check_out'],
            'check_out' => ['nullable', 'date', 'after:check_in', 'required_with:check_in'],
            'sort' => ['nullable', Rule::in(['price_asc', 'price_desc', 'capacity', 'newest', 'recommended'])],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'include_inactive' => ['nullable', 'boolean'],
        ];
    }
}
