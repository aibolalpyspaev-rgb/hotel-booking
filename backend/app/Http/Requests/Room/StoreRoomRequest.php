<?php

namespace App\Http\Requests\Room;

use App\Enums\RoomType;
use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

class StoreRoomRequest extends ApiRequest
{
    protected bool $partial = false;

    public function rules(): array
    {
        $req = $this->partial ? 'sometimes' : 'required';

        return [
            'hotel_id' => [$req, 'integer', 'exists:hotels,id'],
            'name' => [$req, 'string', 'min:2', 'max:255'],
            'type' => [$req, Rule::in(RoomType::values())],
            'description' => ['nullable', 'string', 'max:3000'],
            'price_per_night' => [$req, 'integer', 'min:1000', 'max:10000000'],
            'capacity' => [$req, 'integer', 'between:1,10'],
            'beds' => ['nullable', 'integer', 'between:1,10'],
            'area' => ['nullable', 'integer', 'between:5,1000'],
            'image_url' => ['nullable', 'url', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
            'amenities' => ['sometimes', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
        ];
    }
}
