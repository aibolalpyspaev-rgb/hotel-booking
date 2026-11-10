<?php

namespace App\Http\Requests\Hotel;

use App\Http\Requests\ApiRequest;
use App\Services\HotelService;
use Illuminate\Validation\Rule;

class HotelIndexRequest extends ApiRequest
{
    protected function prepareForValidation(): void
    {
        // ?stars=4,5 и ?amenities=1,3 -> массивы
        foreach (['stars', 'amenities'] as $key) {
            if (is_string($this->input($key)) && $this->input($key) !== '') {
                $this->merge([$key => explode(',', $this->input($key))]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0'],
            'stars' => ['nullable', 'array'],
            'stars.*' => ['integer', 'between:1,5'],
            'min_rating' => ['nullable', 'numeric', 'between:0,5'],
            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['integer', 'exists:amenities,id'],
            'guests' => ['nullable', 'integer', 'between:1,10'],
            'check_in' => ['nullable', 'date', 'after_or_equal:today', 'required_with:check_out'],
            'check_out' => ['nullable', 'date', 'after:check_in', 'required_with:check_in'],
            'sort' => ['nullable', Rule::in(HotelService::SORTS)],
            'per_page' => ['nullable', 'integer', 'between:1,50'],
            'include_inactive' => ['nullable', 'boolean'],
        ];
    }
}
