<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'hotel_id' => $this->hotel_id,
            'booking_id' => $this->booking_id,
            'user' => $this->whenLoaded('user', fn () => ['id' => $this->user->id, 'name' => $this->user->name]),
            'hotel' => $this->whenLoaded('hotel', fn () => [
                'id' => $this->hotel->id,
                'name' => $this->hotel->name,
                'city' => $this->hotel->city,
                'image_url' => $this->hotel->image_url,
            ]),
            'can_edit' => $request->user()?->id === $this->user_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
