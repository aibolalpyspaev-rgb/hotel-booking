<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;

/** Проверка владельца бронирования. */
class BookingPolicy
{
    public function view(User $user, Booking $booking): bool
    {
        return $user->isAdmin() || $booking->user_id === $user->id;
    }

    public function cancel(User $user, Booking $booking): bool
    {
        return $user->isAdmin() || $booking->user_id === $user->id;
    }

    public function confirm(User $user, Booking $booking): bool
    {
        return $booking->user_id === $user->id || $user->isAdmin();
    }
}
