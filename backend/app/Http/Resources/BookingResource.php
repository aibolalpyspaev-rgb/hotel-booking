<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'room_id' => $this->room_id,
            'user_id' => $this->user_id,
            'check_in' => $this->check_in->toDateString(),
            'check_out' => $this->check_out->toDateString(),
            'guests' => $this->guests,
            'nights' => $this->nights,
            'price_per_night' => $this->price_per_night,
            'total_price' => $this->total_price,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'guest_name' => $this->guest_name,
            'guest_phone' => $this->guest_phone,
            'special_requests' => $this->special_requests,
            'can_cancel' => $this->isCancellable(),
            'can_review' => $this->relationLoaded('review') ? ($this->review === null && $this->isReviewable()) : null,
            'review' => new ReviewResource($this->whenLoaded('review')),
            'room' => new RoomResource($this->whenLoaded('room')),
            'user' => new UserResource($this->whenLoaded('user')),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
