<?php

namespace App\Http\Requests;

class ChatRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:1', 'max:1000'],
            'session_id' => ['nullable', 'uuid'],
        ];
    }
}
