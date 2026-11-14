<?php

namespace App\Services\Chat;

use Anthropic\Client;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Необязательное подключение языковой модели Claude (Anthropic).
 * Работает ТОЛЬКО на сервере: ключ берётся из .env (ANTHROPIC_API_KEY) и не попадает на фронтенд.
 * Модель получает уже найденные в БД отели и лишь формулирует ответ — придумывать данные ей запрещено.
 */
class ClaudeAssistant
{
    private const SYSTEM_PROMPT = <<<'TXT'
Ты — Hotel Assistant, дружелюбный помощник веб-сервиса бронирования отелей в Казахстане.
Отвечай на русском языке (или на языке пользователя), кратко: 2–5 предложений, без markdown-таблиц.
Используй ТОЛЬКО факты из блока DATA: названия отелей, города, цены, рейтинги, правила сервиса.
Никогда не придумывай отели, цены, свободные номера или условия, которых нет в DATA.
Если в DATA есть поле "question" — обязательно задай пользователю этот уточняющий вопрос.
Если найдены отели — коротко представь их (название, цена от … ₸ за ночь), карточки отелей пользователь увидит под твоим сообщением.
Цены указывай в тенге со знаком ₸.
TXT;

    public function enabled(): bool
    {
        return ! empty(config('services.anthropic.key'));
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     */
    public function compose(array $history, string $userMessage, array $data): ?string
    {
        if (! $this->enabled()) {
            return null;
        }

        try {
            $client = new Client(apiKey: config('services.anthropic.key'));

            $messages = [];
            foreach (array_slice($history, -8) as $msg) {
                $role = $msg['role'] === 'user' ? 'user' : 'assistant';
                if ($messages && end($messages)['role'] === $role) {
                    continue; // API требует чередования ролей
                }
                $messages[] = ['role' => $role, 'content' => $msg['content']];
            }
            if ($messages && $messages[0]['role'] !== 'user') {
                array_shift($messages);
            }
            if ($messages && end($messages)['role'] === 'user') {
                array_pop($messages);
            }

            $messages[] = [
                'role' => 'user',
                'content' => $userMessage."\n\nDATA:\n".json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            ];

            $response = $client->messages->create(
                model: config('services.anthropic.model', 'claude-opus-5-5'),
                maxTokens: 1024,
                system: self::SYSTEM_PROMPT,
                messages: $messages,
            );

            if ($response->stopReason === 'refusal') {
                return null;
            }

            $text = '';
            foreach ($response->content as $block) {
                if ($block->type === 'text') {
                    $text .= $block->text;
                }
            }

            return trim($text) !== '' ? trim($text) : null;
        } catch (Throwable $e) {
            // При любой ошибке AI (нет сети, неверный ключ) бот продолжает работать на встроенном алгоритме
            Log::warning('Claude assistant failed: '.$e->getMessage());

            return null;
        }
    }
}
