<?php

namespace App\Http\Requests\Hotel;

use App\Http\Requests\ApiRequest;

class StoreHotelRequest extends ApiRequest
{
    protected bool $partial = false;

    public function rules(): array
    {
        $req = $this->partial ? 'sometimes' : 'required';

        return [
            'name' => [$req, 'string', 'min:2', 'max:255'],
            'city' => [$req, 'string', 'min:2', 'max:100'],
            'address' => [$req, 'string', 'max:255'],
            'description' => [$req, 'string', 'min:10', 'max:5000'],
            'short_description' => ['nullable', 'string', 'max:300'],
            'stars' => [$req, 'integer', 'between:1,5'],
            'image_url' => ['nullable', 'url', 'max:500'],
            'gallery' => ['nullable', 'array', 'max:10'],
            'gallery.*' => ['url', 'max:500'],
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:255'],
            'check_in_time' => ['nullable', 'date_format:H:i'],
            'check_out_time' => ['nullable', 'date_format:H:i'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
