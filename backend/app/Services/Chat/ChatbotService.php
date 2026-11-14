<?php

namespace App\Services\Chat;

use App\Enums\BookingStatus;
use App\Models\Amenity;
use App\Models\Booking;
use App\Models\ChatSession;
use App\Models\Hotel;
use App\Models\User;
use App\Services\HotelService;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Hotel Assistant — интеллектуальный помощник.
 * 1) Разбирает сообщение (MessageParser), 2) помнит контекст диалога (город, гости, бюджет, даты),
 * 3) задаёт уточняющие вопросы, 4) ищет РЕАЛЬНЫЕ отели в БД через HotelService,
 * 5) при наличии ключа Anthropic формулирует ответ с помощью Claude.
 */
class ChatbotService
{
    public function __construct(
        private readonly MessageParser $parser,
        private readonly HotelService $hotels,
        private readonly ClaudeAssistant $llm,
    ) {}

    public function handle(string $message, ?string $sessionId, ?User $user): array
    {
        $session = $this->resolveSession($sessionId, $user);
        $ctx = $session->context ?? [];

        $session->messages()->create(['role' => 'user', 'content' => $message]);

        $cities = Hotel::active()->distinct()->orderBy('city')->pluck('city')->all();
        $p = $this->parser->parse($message, $cities);

        // Ответ на уточняющий вопрос о бюджете
        if (($ctx['awaiting'] ?? null) === 'budget') {
            if ($p['any_budget']) {
                $ctx['budget_skipped'] = true;
            } elseif (! $p['budget'] && ($n = $this->parser->bareNumberBudget($message))) {
                $p['budget'] = $n;
            }
        }
        // Ответ на вопрос о количестве гостей простым числом
        if (($ctx['awaiting'] ?? null) === 'guests' && ! $p['guests'] && preg_match('/^\s*(\d{1,2})\s*$/', $message, $m)) {
            $p['guests'] = (int) $m[1];
        }

        $hasSearchEntities = $p['city'] || $p['guests'] || $p['budget'] || $p['stars'] || $p['amenities'] || $p['dates'] || $p['cheap'] || $p['luxury'];

        $result = match (true) {
            $p['intent'] === 'reset' => $this->reset($ctx),
            in_array($p['intent'], ['greeting', 'about'], true) && ! $hasSearchEntities => $this->greeting($user),
            $p['intent'] === 'thanks' && ! $hasSearchEntities => $this->simple('Пожалуйста! Если понадобится подобрать ещё один отель — просто напишите 😊', ['Новый поиск', 'Как забронировать?']),
            $p['intent'] === 'how_to_book' => $this->howToBook(),
            $p['intent'] === 'cancel' => $this->cancelRules(),
            $p['intent'] === 'payment' => $this->payment(),
            $p['intent'] === 'checkin_time' => $this->checkinTime($ctx),
            $p['intent'] === 'reviews' && ! $hasSearchEntities => $this->reviewsInfo(),
            $p['intent'] === 'contacts' => $this->contacts(),
            $p['intent'] === 'cities' => $this->citiesInfo(),
            $p['intent'] === 'my_bookings' => $this->myBookings($user),
            $hasSearchEntities || $p['intent'] === 'search' || ($ctx['awaiting'] ?? null) !== null => null,
            default => $this->fallback(),
        };

        if ($result === null) {
            [$result, $ctx] = $this->search($p, $ctx, $cities);
        } elseif ($p['intent'] === 'reset') {
            $ctx = [];
        }

        $mode = 'rules';
        if ($this->llm->enabled()) {
            $history = $session->messages()->latest('id')->limit(10)->get()->reverse()
                ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])->values()->all();
            array_pop($history); // текущее сообщение передаём отдельно

            $llmReply = $this->llm->compose($history, $message, [
                'draft_answer' => $result['reply'],
                'question' => $result['question'] ?? null,
                'search_filters' => $result['filters'] ?? null,
                'hotels_found' => $result['hotels'] ?? [],
                'service_rules' => $this->rulesSummary(),
            ]);
            if ($llmReply) {
                $result['reply'] = $llmReply;
                $mode = 'llm';
            }
        }

        $session->update(['context' => $ctx, 'user_id' => $session->user_id ?? $user?->id]);
        $session->messages()->create([
            'role' => 'bot',
            'content' => $result['reply'],
            'payload' => ['hotels' => $result['hotels'] ?? [], 'suggestions' => $result['suggestions'] ?? []],
        ]);

        return [
            'session_id' => $session->uuid,
            'reply' => $result['reply'],
            'hotels' => $result['hotels'] ?? [],
            'suggestions' => $result['suggestions'] ?? [],
            'filters' => $result['filters'] ?? null,
            'mode' => $mode,
        ];
    }

    public function history(string $sessionId): array
    {
        $session = ChatSession::where('uuid', $sessionId)->first();
        if (! $session) {
            return [];
        }

        return $session->messages()->orderBy('id')->limit(100)->get()->map(fn ($m) => [
            'role' => $m->role,
            'content' => $m->content,
            'hotels' => $m->payload['hotels'] ?? [],
            'suggestions' => $m->payload['suggestions'] ?? [],
            'created_at' => $m->created_at,
        ])->all();
    }

    // ---------------------------------------------------------------- поиск

    private function search(array $p, array $ctx, array $cities): array
    {
        // Город распознан, но отелей в нём в базе нет — честно говорим и предлагаем доступные
        if ($p['city'] && ! in_array($p['city'], $cities, true)) {
            $ctx['awaiting'] = 'city';
            $q = "К сожалению, в городе {$p['city']} пока нет отелей в нашем сервисе. Отели доступны в городах: ".implode(', ', $cities).'. Какой город вам подходит?';

            return [['reply' => $q, 'question' => $q, 'suggestions' => array_slice($cities, 0, 6)], $ctx];
        }

        // Объединяем новые данные с тем, что пользователь сообщил раньше
        if ($p['city']) {
            if ($p['city'] !== ($ctx['city'] ?? null)) {
                unset($ctx['budget_skipped']);
            }
            $ctx['city'] = $p['city'];
        }
        foreach (['guests', 'budget', 'stars'] as $key) {
            if ($p[$key]) {
                $ctx[$key] = $p[$key];
            }
        }
        if ($p['cheap']) {
            $ctx['cheap'] = true;
            $ctx['luxury'] = false;
        }
        if ($p['luxury']) {
            $ctx['luxury'] = true;
            $ctx['cheap'] = false;
        }
        if ($p['amenities']) {
            $ctx['amenities'] = array_values(array_unique(array_merge($ctx['amenities'] ?? [], $p['amenities'])));
        }
        if (! empty($p['dates']['check_in'])) {
            $ctx['check_in'] = $p['dates']['check_in'];
            $ctx['check_out'] = $p['dates']['check_out'] ?? null;
        }
        if (! empty($p['dates']['nights']) && ! empty($ctx['check_in']) && empty($p['dates']['check_in'])) {
            $ctx['check_out'] = \Carbon\CarbonImmutable::parse($ctx['check_in'])->addDays($p['dates']['nights'])->toDateString();
        }
        if (preg_match('/дешевле|подешевле/u', $p['text']) && ! empty($ctx['budget'])) {
            $ctx['budget'] = (int) round($ctx['budget'] * 0.75, -3);
        }
        if (preg_match('/только\s*5|5\s*звезд/u', $p['text'])) {
            $ctx['stars'] = 5;
        }

        // 1. Не знаем город — спрашиваем
        if (empty($ctx['city'])) {
            $ctx['awaiting'] = 'city';
            $known = implode(', ', $cities);

            if ($p['text'] && preg_match('/\b(в|во)\s+([а-яa-z-]{3,})/u', $p['text'], $m) && ! in_array($m[2], ['центре', 'городе', 'пределах', 'районе'], true)) {
                $q = 'К сожалению, в этом городе пока нет отелей в нашем сервисе. Отели доступны в городах: '.$known.'. Какой город вам подходит?';
            } else {
                $q = 'С удовольствием помогу подобрать отель! В каком городе вы планируете остановиться? Доступны: '.$known.'.';
            }

            return [['reply' => $q, 'question' => $q, 'suggestions' => array_slice($cities, 0, 6)], $ctx];
        }

        // 2. Пользователь хочет «недорого», но бюджет не назвал — уточняем
        if (! empty($ctx['cheap']) && empty($ctx['budget']) && empty($ctx['budget_skipped'])) {
            $ctx['awaiting'] = 'budget';
            $guestsText = ! empty($ctx['guests']) ? ' на '.$this->guestsWord($ctx['guests']) : '';
            $q = "Конечно! Ищу недорогой отель в городе {$ctx['city']}{$guestsText}. Какой у вас бюджет за одну ночь?";

            return [['reply' => $q, 'question' => $q, 'suggestions' => ['До 20 000 ₸', 'До 30 000 ₸', 'До 50 000 ₸', 'Не важно']], $ctx];
        }

        $ctx['awaiting'] = null;
        $filters = $this->buildFilters($ctx);
        $hotels = $this->hotels->find($filters, 4);
        $note = '';

        // 3. Ничего не нашли — смягчаем условия по очереди и честно об этом говорим
        if ($hotels->isEmpty() && ! empty($filters['max_price'])) {
            $relaxed = $filters;
            unset($relaxed['max_price']);
            $relaxed['sort'] = 'price_asc';
            $hotels = $this->hotels->find($relaxed, 3);
            if ($hotels->isNotEmpty()) {
                $note = 'В пределах '.$this->money($filters['max_price']).' за ночь свободных вариантов нет. Вот самые доступные из имеющихся:';
                $filters = $relaxed;
            }
        }
        if ($hotels->isEmpty() && (! empty($filters['stars']) || ! empty($filters['amenities']))) {
            $relaxed = $filters;
            unset($relaxed['stars'], $relaxed['amenities']);
            $hotels = $this->hotels->find($relaxed, 3);
            if ($hotels->isNotEmpty()) {
                $note = 'С такими требованиями (звёзды/удобства) вариантов не нашлось. Посмотрите похожие отели:';
                $filters = $relaxed;
            }
        }
        if ($hotels->isEmpty() && ! empty($filters['check_in'])) {
            $note = 'На выбранные даты в городе '.$ctx['city'].' все подходящие номера заняты. Попробуйте изменить даты — напишите, например, «с 20 по 23 декабря».';

            return [['reply' => $note, 'hotels' => [], 'filters' => $filters, 'suggestions' => ['На выходные', 'Новый поиск']], $ctx];
        }
        if ($hotels->isEmpty()) {
            $msg = 'К сожалению, по вашему запросу ничего не нашлось. Попробуйте увеличить бюджет или изменить количество гостей.';

            return [['reply' => $msg, 'hotels' => [], 'filters' => $filters, 'suggestions' => ['Не важно', 'Новый поиск']], $ctx];
        }

        $cards = $this->hotelCards($hotels, $filters);
        $reply = $note ?: $this->resultIntro($ctx, $hotels->count());
        foreach ($cards as $i => $h) {
            $reply .= "\n".($i + 1).". {$h['name']} ({$h['stars']}★, рейтинг {$h['rating']}) — от ".$this->money($h['min_price']).' за ночь';
        }
        $reply .= "\n\nНажмите на карточку, чтобы посмотреть номера и забронировать.";
        if (empty($ctx['check_in'])) {
            $reply .= ' Если укажете даты (например, «с 15 по 18 декабря»), я проверю, свободны ли номера.';
        }

        $suggestions = array_values(array_filter([
            ! empty($ctx['budget']) ? 'Подешевле' : 'Недорогие варианты',
            empty($ctx['stars']) ? 'Только 5 звёзд' : null,
            empty($ctx['check_in']) ? 'На выходные' : null,
            empty($ctx['amenities']) ? 'С бассейном' : null,
            'Как забронировать?',
            'Новый поиск',
        ]));

        return [['reply' => $reply, 'hotels' => $cards, 'filters' => $filters, 'suggestions' => array_slice($suggestions, 0, 5)], $ctx];
    }

    private function buildFilters(array $ctx): array
    {
        $amenityIds = [];
        if (! empty($ctx['amenities'])) {
            $amenityIds = Amenity::whereIn('name', $ctx['amenities'])->pluck('id')->all();
        }

        return array_filter([
            'city' => $ctx['city'] ?? null,
            'guests' => $ctx['guests'] ?? null,
            'max_price' => $ctx['budget'] ?? null,
            'stars' => ! empty($ctx['stars']) ? [$ctx['stars']] : null,
            'amenities' => $amenityIds ?: null,
            'check_in' => ! empty($ctx['check_out']) ? ($ctx['check_in'] ?? null) : null,
            'check_out' => $ctx['check_out'] ?? null,
            'sort' => ! empty($ctx['cheap']) ? 'price_asc' : (! empty($ctx['luxury']) ? 'rating' : 'rating'),
        ]);
    }

    private function hotelCards(Collection $hotels, array $filters): array
    {
        return $hotels->map(fn (Hotel $h) => [
            'id' => $h->id,
            'name' => $h->name,
            'city' => $h->city,
            'stars' => $h->stars,
            'rating' => number_format((float) $h->rating, 1),
            'image_url' => $h->image_url,
            'min_price' => (int) $h->min_price,
            'available_rooms' => (int) $h->available_rooms_count,
            'query' => array_filter([
                'check_in' => $filters['check_in'] ?? null,
                'check_out' => $filters['check_out'] ?? null,
                'guests' => $filters['guests'] ?? null,
            ]),
        ])->values()->all();
    }

    private function resultIntro(array $ctx, int $count): string
    {
        $parts = [];
        if (! empty($ctx['guests'])) {
            $parts[] = 'на '.$this->guestsWord($ctx['guests']);
        }
        if (! empty($ctx['budget'])) {
            $parts[] = 'до '.$this->money($ctx['budget']).' за ночь';
        }
        if (! empty($ctx['check_in']) && ! empty($ctx['check_out'])) {
            $parts[] = 'с '.date('d.m', strtotime($ctx['check_in'])).' по '.date('d.m', strtotime($ctx['check_out']));
        }
        if (! empty($ctx['stars'])) {
            $parts[] = $ctx['stars'].'★';
        }
        if (! empty($ctx['amenities'])) {
            $parts[] = 'удобства: '.implode(', ', $ctx['amenities']);
        }
        $details = $parts ? ' ('.implode(', ', $parts).')' : '';

        return "Я нашёл подходящие варианты в городе {$ctx['city']}{$details}. Посмотрите эти отели:";
    }

    // ------------------------------------------------------- готовые ответы

    private function greeting(?User $user): array
    {
        $name = $user ? ', '.Str::before($user->name, ' ') : '';

        return $this->simple(
            "Здравствуйте{$name}! Я Hotel Assistant 🤖 Помогу подобрать отель по городу, бюджету и количеству гостей, проверю свободные даты и расскажу, как забронировать номер. Например, напишите: «Найди недорогой отель в Астане на двоих».",
            ['Отель в Астане на двоих', 'Недорогой отель в Алматы', 'Как забронировать?', 'Правила отмены']
        );
    }

    private function howToBook(): array
    {
        return $this->simple(
            "Бронирование занимает пару минут:\n1. Найдите отель через поиск или спросите меня.\n2. Откройте страницу отеля и выберите номер.\n3. Укажите даты заезда/выезда и количество гостей — стоимость посчитается автоматически.\n4. Нажмите «Забронировать» (нужно войти в аккаунт).\n5. Подтвердите бронь — она появится в разделе «Мои бронирования».\nСистема сама проверяет, что номер свободен на выбранные даты.",
            ['Найти отель', 'Правила отмены', 'Способы оплаты']
        );
    }

    private function cancelRules(): array
    {
        return $this->simple(
            "Правила отмены: бронирование в статусе «Ожидает подтверждения» или «Подтверждено» можно бесплатно отменить в личном кабинете (раздел «Мои бронирования») не позднее чем за сутки до даты заезда. В день заезда и после отмена через сайт недоступна — обратитесь в поддержку. После отмены номер сразу становится доступен другим гостям.",
            ['Мои бронирования', 'Как забронировать?', 'Найти отель']
        );
    }

    private function payment(): array
    {
        return $this->simple(
            'Оплата производится при заселении в отеле (наличными или картой). На сайте после оформления вы подтверждаете бронирование — это гарантирует номер за вами. Итоговая стоимость = цена за ночь × количество ночей, без скрытых комиссий.',
            ['Как забронировать?', 'Правила отмены']
        );
    }

    private function checkinTime(array $ctx): array
    {
        return $this->simple(
            'Стандартное время заезда — с 14:00, выезда — до 12:00. Точное время указано на странице каждого отеля. Ранний заезд или поздний выезд можно указать в поле «Пожелания» при бронировании.',
            ['Найти отель', 'Как забронировать?']
        );
    }

    private function reviewsInfo(): array
    {
        return $this->simple(
            'Отзывы могут оставлять только гости, которые действительно проживали в отеле — после завершения бронирования в разделе «Мои бронирования» появится кнопка «Оставить отзыв». Рейтинг отеля рассчитывается автоматически по всем отзывам.',
            ['Найти отель', 'Мои бронирования']
        );
    }

    private function contacts(): array
    {
        return $this->simple(
            'Служба поддержки работает круглосуточно: телефон +7 (700) 000-00-00, email support@hotelbooking.kz. Также я всегда готов помочь здесь, в чате!',
            ['Как забронировать?', 'Правила отмены']
        );
    }

    private function citiesInfo(): array
    {
        $rows = $this->hotels->cities();
        $text = "Сейчас в сервисе есть отели в городах:\n".$rows->map(
            fn ($c) => "• {$c->city} — {$c->hotels_count} ".$this->plural($c->hotels_count, 'отель', 'отеля', 'отелей').($c->min_price ? ', от '.$this->money((int) $c->min_price) : '')
        )->implode("\n");

        return $this->simple($text, $rows->pluck('city')->take(5)->all());
    }

    private function myBookings(?User $user): array
    {
        if (! $user) {
            return $this->simple('Чтобы посмотреть свои бронирования, войдите в аккаунт — после этого они будут в разделе «Мои бронирования».', ['Как забронировать?']);
        }

        $bookings = Booking::with('room.hotel')
            ->where('user_id', $user->id)
            ->whereIn('status', BookingStatus::blocking())
            ->orderBy('check_in')->limit(5)->get();

        if ($bookings->isEmpty()) {
            return $this->simple('У вас пока нет активных бронирований. Хотите, подберу отель?', ['Отель в Астане на двоих', 'Недорогой отель в Алматы']);
        }

        $text = "Ваши активные бронирования:\n".$bookings->map(fn (Booking $b) => "• {$b->code}: {$b->room->hotel->name}, {$b->room->name}, {$b->check_in->format('d.m.Y')}–{$b->check_out->format('d.m.Y')}, ".$this->money($b->total_price).' — '.$b->status->label())->implode("\n");

        return $this->simple($text, ['Правила отмены', 'Найти отель']);
    }

    private function reset(array $ctx): array
    {
        return $this->simple('Хорошо, начнём новый поиск! В каком городе ищете отель и на сколько гостей?', ['Астана', 'Алматы', 'Шымкент', 'Туркестан']);
    }

    private function fallback(): array
    {
        return $this->simple(
            'Я не совсем понял вопрос 🙂 Я умею подбирать отели (укажите город, бюджет и количество гостей), проверять свободные даты и рассказывать о бронировании, оплате и отмене.',
            ['Найди отель в Астане на двоих', 'Как забронировать?', 'Правила отмены', 'Какие города есть?']
        );
    }

    private function simple(string $reply, array $suggestions = []): array
    {
        return ['reply' => $reply, 'suggestions' => $suggestions, 'hotels' => []];
    }

    private function rulesSummary(): array
    {
        return [
            'booking' => 'Выбрать отель → номер → даты и гостей → «Забронировать» → подтвердить. Нужна авторизация.',
            'cancel' => 'Бесплатная отмена в личном кабинете не позднее чем за сутки до заезда.',
            'payment' => 'Оплата при заселении, на сайте — подтверждение брони.',
            'check_in_out' => 'Заезд с 14:00, выезд до 12:00.',
            'currency' => 'Тенге (₸)',
        ];
    }

    private function resolveSession(?string $sessionId, ?User $user): ChatSession
    {
        if ($sessionId && ($session = ChatSession::where('uuid', $sessionId)->first())) {
            return $session;
        }

        return ChatSession::create(['uuid' => (string) Str::uuid(), 'user_id' => $user?->id, 'context' => []]);
    }

    private function money(int $amount): string
    {
        return number_format($amount, 0, ',', ' ').' ₸';
    }

    private function guestsWord(int $n): string
    {
        return [1 => 'одного', 2 => 'двоих', 3 => 'троих', 4 => 'четверых', 5 => 'пятерых', 6 => 'шестерых'][$n] ?? "{$n} гостей";
    }

    private function plural(int $n, string $one, string $few, string $many): string
    {
        $n = abs($n) % 100;
        $n1 = $n % 10;

        return match (true) {
            $n > 10 && $n < 20 => $many,
            $n1 > 1 && $n1 < 5 => $few,
            $n1 === 1 => $one,
            default => $many,
        };
    }
}
