<?php

namespace App\Http\Requests\Amenity;

use App\Http\Requests\ApiRequest;
use Illuminate\Validation\Rule;

class AmenityRequest extends ApiRequest
{
    public function rules(): array
    {
        $amenity = $this->route('amenity');

        return [
            'name' => ['required', 'string', 'min:2', 'max:100', Rule::unique('amenities', 'name')->ignore($amenity?->id)],
            'icon' => ['nullable', 'string', 'max:50', 'regex:/^[a-z0-9-]+$/'],
        ];
    }
}
