<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChatRequest;
use App\Services\Chat\ChatbotService;
use Illuminate\Http\JsonResponse;

class ChatController extends Controller
{
    public function __construct(private readonly ChatbotService $bot) {}

    /** POST /api/chat — сообщение AI-помощнику */
    public function send(ChatRequest $request): JsonResponse
    {
        $result = $this->bot->handle(
            $request->validated('message'),
            $request->validated('session_id'),
            $request->user('sanctum'),
        );

        return response()->json(['success' => true, 'data' => $result]);
    }

    /** GET /api/chat/{sessionId} — история переписки */
    public function history(string $sessionId): JsonResponse
    {
        return response()->json(['data' => $this->bot->history($sessionId)]);
    }
}
