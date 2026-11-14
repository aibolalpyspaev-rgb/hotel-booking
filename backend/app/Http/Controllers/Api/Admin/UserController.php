<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    /** GET /api/admin/users */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', 'in:user,admin'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $users = User::query()
            ->withCount(['bookings', 'reviews'])
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")))
            ->when($filters['role'] ?? null, fn ($q, $r) => $q->where('role', $r))
            ->latest()
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return UserResource::collection($users);
    }

    /** PUT /api/admin/users/{id} */
    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $data = $request->validated();

        if ($user->id === $request->user()->id && isset($data['role']) && $data['role'] !== 'admin') {
            throw new BusinessException('Нельзя снять права администратора с самого себя.', 422);
        }

        $user->update($data);

        return (new UserResource($user->loadCount(['bookings', 'reviews'])))
            ->additional(['success' => true, 'message' => 'Пользователь обновлён.']);
    }

    /** DELETE /api/admin/users/{id} */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            throw new BusinessException('Нельзя удалить собственный аккаунт администратора.', 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['success' => true, 'message' => 'Пользователь удалён.']);
    }
}
