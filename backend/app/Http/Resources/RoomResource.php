<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'hotel_id' => $this->hotel_id,
            'name' => $this->name,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'description' => $this->description,
            'price_per_night' => $this->price_per_night,
            'capacity' => $this->capacity,
            'beds' => $this->beds,
            'area' => $this->area,
            'image_url' => $this->image_url,
            'is_active' => $this->is_active,
            'is_available' => $this->when(array_key_exists('is_available', $this->resource->getAttributes()),fn () => (bool) $this->is_available),
            'amenities' => AmenityResource::collection($this->whenLoaded('amenities')),
            'hotel' => new HotelResource($this->whenLoaded('hotel')),
            'bookings_count' => $this->whenCounted('bookings'),
        ];
    }
}
