<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    /** POST /api/register */
    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->auth->register($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Регистрация прошла успешно.',
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
        ], 201);
    }

    /** POST /api/login */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->auth->login($request->validated('email'), $request->validated('password'));

        return response()->json([
            'success' => true,
            'message' => 'Вы успешно вошли.',
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
        ]);
    }

    /** POST /api/logout */
    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->user());

        return response()->json(['success' => true, 'message' => 'Вы вышли из аккаунта.']);
    }

    /** GET /api/user */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->loadCount(['bookings', 'reviews']));
    }

    /** PUT /api/user */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->auth->updateProfile($request->user(), $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Профиль обновлён.',
            'user' => new UserResource($user),
        ]);
    }
}
