<?php

use App\Http\Controllers\Api\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AmenityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\HotelController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\StatsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| REST API сервиса бронирования отелей
|--------------------------------------------------------------------------
*/

// ---------- Публичные маршруты (гость) ----------
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::get('/hotels', [HotelController::class, 'index']);
Route::get('/hotels/{hotel}', [HotelController::class, 'show'])->whereNumber('hotel');
Route::get('/cities', [HotelController::class, 'cities']);

Route::get('/rooms', [RoomController::class, 'index']);
Route::get('/rooms/{room}', [RoomController::class, 'show'])->whereNumber('room');
Route::get('/rooms/{room}/availability', [RoomController::class, 'availability'])->whereNumber('room');

Route::get('/reviews', [ReviewController::class, 'index']);
Route::get('/amenities', [AmenityController::class, 'index']);
Route::get('/stats', StatsController::class);

// AI-помощник доступен и гостям (если передан токен — бот знает пользователя)
Route::middleware('throttle:30,1')->group(function () {
    Route::post('/chat', [ChatController::class, 'send']);
    Route::get('/chat/{sessionId}', [ChatController::class, 'history'])->whereUuid('sessionId');
});

// ---------- Авторизованный пользователь ----------
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/user', [AuthController::class, 'update']);

    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show'])->whereNumber('booking');
    Route::post('/bookings', [BookingController::class, 'store'])->middleware('throttle:20,1');
    Route::patch('/bookings/{booking}/confirm', [BookingController::class, 'confirm'])->whereNumber('booking');
    Route::patch('/bookings/{booking}/cancel', [BookingController::class, 'cancel'])->whereNumber('booking');

    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::put('/reviews/{review}', [ReviewController::class, 'update'])->whereNumber('review');
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy'])->whereNumber('review');

    // ---------- Администратор ----------
    Route::middleware('role:admin')->group(function () {
        Route::post('/hotels', [HotelController::class, 'store']);
        Route::put('/hotels/{hotel}', [HotelController::class, 'update'])->whereNumber('hotel');
        Route::delete('/hotels/{hotel}', [HotelController::class, 'destroy'])->whereNumber('hotel');

        Route::post('/rooms', [RoomController::class, 'store']);
        Route::put('/rooms/{room}', [RoomController::class, 'update'])->whereNumber('room');
        Route::delete('/rooms/{room}', [RoomController::class, 'destroy'])->whereNumber('room');

        Route::post('/amenities', [AmenityController::class, 'store']);
        Route::put('/amenities/{amenity}', [AmenityController::class, 'update'])->whereNumber('amenity');
        Route::delete('/amenities/{amenity}', [AmenityController::class, 'destroy'])->whereNumber('amenity');

        Route::prefix('admin')->group(function () {
            Route::get('/stats', DashboardController::class);
            Route::get('/bookings', [AdminBookingController::class, 'index']);
            Route::patch('/bookings/{booking}/status', [AdminBookingController::class, 'updateStatus'])->whereNumber('booking');
            Route::get('/users', [AdminUserController::class, 'index']);
            Route::put('/users/{user}', [AdminUserController::class, 'update'])->whereNumber('user');
            Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->whereNumber('user');
        });
    });
});
