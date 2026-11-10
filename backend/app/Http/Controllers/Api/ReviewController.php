<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Http\Requests\Review\UpdateReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ReviewController extends Controller
{
    public function __construct(private readonly ReviewService $reviews) {}

    /** GET /api/reviews */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'hotel_id' => ['nullable', 'integer'],
            'user_id' => ['nullable', 'integer'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'sort' => ['nullable', 'in:newest,rating'],
            'per_page' => ['nullable', 'integer', 'between:1,50'],
        ]);

        return ReviewResource::collection($this->reviews->list($filters));
    }

    /** POST /api/reviews */
    public function store(StoreReviewRequest $request): JsonResponse
    {
        return (new ReviewResource($this->reviews->create($request->user(), $request->validated())))
            ->additional(['success' => true, 'message' => 'Спасибо за отзыв!'])
            ->response()->setStatusCode(201);
    }

    /** PUT /api/reviews/{id} */
    public function update(UpdateReviewRequest $request, Review $review): ReviewResource
    {
        Gate::authorize('update', $review);

        return (new ReviewResource($this->reviews->update($review, $request->validated())))
            ->additional(['success' => true, 'message' => 'Отзыв обновлён.']);
    }

    /** DELETE /api/reviews/{id} */
    public function destroy(Review $review): JsonResponse
    {
        Gate::authorize('delete', $review);
        $this->reviews->delete($review);

        return response()->json(['success' => true, 'message' => 'Отзыв удалён.']);
    }
}
