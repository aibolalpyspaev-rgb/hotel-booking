<?php

namespace App\Http\Requests\Review;

use App\Http\Requests\ApiRequest;

class UpdateReviewRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'rating' => ['sometimes', 'required', 'integer', 'between:1,5'],
            'comment' => ['sometimes', 'required', 'string', 'min:10', 'max:2000'],
        ];
    }
}
