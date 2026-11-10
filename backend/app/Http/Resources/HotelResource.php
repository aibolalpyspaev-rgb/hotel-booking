<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HotelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'city' => $this->city,
            'address' => $this->address,
            'description' => $this->description,
            'short_description' => $this->short_description ?: str($this->description)->limit(140)->toString(),
            'stars' => $this->stars,
            'rating' => round((float) $this->rating, 1),
            'image_url' => $this->image_url,
            'gallery' => $this->gallery ?? [],
            'phone' => $this->phone,
            'email' => $this->email,
            'check_in_time' => substr((string) $this->check_in_time, 0, 5),
            'check_out_time' => substr((string) $this->check_out_time, 0, 5),
            'is_active' => $this->is_active,
            'min_price' => $this->when(isset($this->min_price), fn () => (int) $this->min_price),
            'available_rooms_count' => $this->when(isset($this->available_rooms_count), fn () => (int) $this->available_rooms_count),
            'reviews_count' => $this->whenCounted('reviews'),
            'rooms_count' => $this->whenCounted('rooms'),
            'rooms' => RoomResource::collection($this->whenLoaded('rooms')),
            'reviews' => ReviewResource::collection($this->whenLoaded('reviews')),
            'amenities' => $this->when(isset($this->hotel_amenities), fn () => AmenityResource::collection($this->hotel_amenities)),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
