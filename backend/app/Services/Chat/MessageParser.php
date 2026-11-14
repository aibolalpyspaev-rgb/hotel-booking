<?php

namespace App\Services\Chat;

use Carbon\CarbonImmutable;

/**
 * Разбор сообщения пользователя на естественном языке (русский/казахский/английский):
 * намерение, город, количество гостей, бюджет, даты, звёзды, удобства.
 */
class MessageParser
{
    private const MONTHS = [
        'январ' => 1, 'феврал' => 2, 'март' => 3, 'апрел' => 4, 'ма[йя]' => 5, 'июн' => 6,
        'июл' => 7, 'август' => 8, 'сентябр' => 9, 'октябр' => 10, 'ноябр' => 11, 'декабр' => 12,
    ];

    private const CITY_ALIASES = [
        'astana' => 'Астана', 'нур-султан' => 'Астана', 'нурсултан' => 'Астана', 'астан' => 'Астана',
        'almaty' => 'Алматы', 'алмат' => 'Алматы', 'алма-ат' => 'Алматы',
        'shymkent' => 'Шымкент', 'шымкент' => 'Шымкент', 'чимкент' => 'Шымкент',
        'turkestan' => 'Туркестан', 'туркестан' => 'Туркестан',
        'aktau' => 'Актау', 'актау' => 'Актау',
        'karaganda' => 'Караганда', 'караганд' => 'Караганда', 'қарағанды' => 'Караганда',
        'burabay' => 'Бурабай', 'бурабай' => 'Бурабай', 'боровое' => 'Бурабай', 'боровом' => 'Бурабай',
    ];

    private const AMENITY_KEYWORDS = [
        'Wi-Fi' => ['wi-fi', 'wifi', 'вайфай', 'вай-фай', 'интернет'],
        'Бассейн' => ['бассейн'],
        'Парковка' => ['парковк', 'машин', 'авто'],
        'Завтрак включён' => ['завтрак'],
        'SPA' => ['спа', 'spa', 'сауна', 'массаж'],
        'Кондиционер' => ['кондиционер'],
        'Фитнес-зал' => ['фитнес', 'спортзал', 'тренаж'],
        'Трансфер из аэропорта' => ['трансфер', 'аэропорт'],
        'Кухня' => ['кухн'],
        'Можно с питомцами' => ['питом', 'собак', 'кошк', 'животн'],
        'Вид на город' => ['вид на город', 'панорам'],
    ];

    public function parse(string $message, array $knownCities = []): array
    {
        $text = mb_strtolower(trim($message));
        $text = str_replace(['ё', ' '], ['е', ' '], $text);

        return [
            'intent' => $this->intent($text),
            'city' => $this->city($text, $knownCities),
            'guests' => $this->guests($text),
            'budget' => $this->budget($text),
            'cheap' => (bool) preg_match('/дешев|недорог|бюджетн|эконом|подешевле|дешевле|cheap/u', $text),
            'luxury' => ! preg_match('/дешев|недорог|бюджетн|эконом/u', $text)
                && (bool) preg_match('/роскош|премиум|лучш|(?<!не)дорог(?!о\s*ли)|vip|luxury|шикарн/u', $text),
            'stars' => $this->stars($text),
            'amenities' => $this->amenities($text),
            'dates' => $this->dates($text),
            'any_budget' => (bool) preg_match('/не важно|неважно|любой|без разниц|не имеет значени|все равно/u', $text),
            'text' => $text,
        ];
    }

    private function intent(string $t): ?string
    {
        $rules = [
            'reset' => '/нов(ый|ого)\s+поиск|начать заново|сначала|сбросить|сброс/u',
            'my_bookings' => '/мои\s+(брон|заказ)|моя\s+брон|мое\s+бронир|где\s+моя\s+брон/u',
            'cancel' => '/отмен|вернуть деньги|возврат/u',
            'how_to_book' => '/как\s+(забронир|оформ|сделать\s+брон|заказ|снять)|процесс брон|шаги брон/u',
            'payment' => '/оплат|заплатит|карт[аой]|предоплат|налич/u',
            'checkin_time' => '/во сколько|врем[яи]\s+(заезд|выезд|засел)|check-?in|check-?out|ранний заезд|поздний выезд/u',
            'reviews' => '/отзыв/u',
            'contacts' => '/контакт|телефон поддерж|поддержк|связаться|оператор|менеджер/u',
            'cities' => '/как(ие|их)\s+город|в каких город|где\s+есть\s+отел|список город/u',
            'thanks' => '/спасибо|благодар|рахмет|thanks|thank you/u',
            'greeting' => '/^(привет|здравствуй|здравствуйте|добрый|салем|сәлем|hello|hi|хай|доброе|добро пожал)/u',
            'about' => '/что ты умеешь|кто ты|чем (ты )?можешь помочь|помощь|help/u',
        ];

        foreach ($rules as $intent => $regex) {
            if (preg_match($regex, $t)) {
                return $intent;
            }
        }

        if (preg_match('/отел|гостиниц|номер|жиль|переноч|останов|засел|найди|подбери|ищу|нужен|нужна|хочу|посовет|порекоменд|забронир|апартам|hotel/u', $t)) {
            return 'search';
        }

        return null;
    }

    private function city(string $t, array $knownCities): ?string
    {
        foreach ($knownCities as $city) {
            $lower = mb_strtolower($city);
            $stem = mb_substr($lower, 0, max(4, mb_strlen($lower) - 2));
            if (str_contains($t, $stem)) {
                return $city;
            }
        }

        foreach (self::CITY_ALIASES as $alias => $city) {
            if (str_contains($t, $alias)) {
                return $city;
            }
        }

        return null;
    }

    private function guests(string $t): ?int
    {
        if (preg_match('/(\d{1,2})\s*(чел|гост|взросл|персон|человек|people|guest)/u', $t, $m)) {
            return max(1, min(10, (int) $m[1]));
        }
        if (preg_match('/(на|для)\s+(\d{1,2})(\s|$)(?!\s*(ноч|сут|дн|звезд|\*|тыс|к\b|000))/u', $t, $m) && (int) $m[2] <= 10) {
            return (int) $m[2];
        }

        $words = [
            1 => '/\b(одного|одной|один|одна|соло|одному)\b|сам[аи]?\s|я один|я одна/u',
            2 => '/двоих|вдвоем|двое|двух|пары|пара|с женой|с мужем|с девушкой|с парнем/u',
            3 => '/троих|втроем|трое|трех/u',
            4 => '/четверых|вчетвером|четверо|четырех/u',
            5 => '/пятерых|впятером|пятеро|пяти человек/u',
            6 => '/шестерых|шестеро/u',
        ];
        foreach ($words as $n => $regex) {
            if (preg_match($regex, $t)) {
                return $n;
            }
        }

        if (preg_match('/семь[еяюи]|с детьми|с ребенком|с ребенк/u', $t)) {
            return 3;
        }

        return null;
    }

    private function budget(string $t): ?int
    {
        // «до 25000», «не дороже 30 тыс», «бюджет 20к», «за 15 000 тенге»
        $months = implode('|', array_keys(self::MONTHS));
        $notDate = '(?![\d.\/-]|\s*(?:'.$months.'|ноч|сут|дн|день|чел|гост|взросл|звезд|числ|час))';
        $num = '(\d{1,3}(?:[\s.]?\d{3})+|\d+)'.$notDate.'\s*(к\b|k\b|тыс[а-я]*|т\.?\s|000)?';
        $patterns = [
            '/(?:до|не\s+дороже|не\s+более|максимум|макс|бюджет[а-я]*|в\s+пределах|за|около|примерно|в\s+районе)\s*:?\s*'.$num.'/u',
            '/'.$num.'\s*(?:тенге|тг|₸|kzt)/u',
        ];

        foreach ($patterns as $p) {
            if (preg_match($p, $t, $m)) {
                $value = (int) preg_replace('/\D/', '', $m[1]);
                $suffix = trim($m[2] ?? '');
                if ($suffix !== '' && $suffix !== '000') {
                    $value *= 1000;
                } elseif ($suffix === '000') {
                    $value *= 1000;
                }
                if ($value > 0 && $value < 1000) {
                    $value *= 1000; // «до 25» в контексте цены за ночь — тысячи тенге
                }
                if ($value >= 3000 && $value <= 5_000_000) {
                    return $value;
                }
            }
        }

        return null;
    }

    /** Вызывается, когда бот явно спросил бюджет: принимаем просто число. */
    public function bareNumberBudget(string $text): ?int
    {
        if (preg_match('/(\d{1,3}(?:[\s.]?\d{3})+|\d+)\s*(к|k|тыс)?/u', mb_strtolower($text), $m)) {
            $value = (int) preg_replace('/\D/', '', $m[1]);
            if (! empty($m[2]) || $value < 1000) {
                $value *= 1000;
            }

            return $value >= 3000 ? $value : null;
        }

        return null;
    }

    private function stars(string $t): ?int
    {
        if (preg_match('/([1-5])\s*(\*|звезд|звёзд|зв\b|star)/u', $t, $m)) {
            return (int) $m[1];
        }
        if (preg_match('/(пяти|четырех|трех)\s*звезд/u', $t, $m)) {
            return ['пяти' => 5, 'четырех' => 4, 'трех' => 3][$m[1]];
        }

        return null;
    }

    private function amenities(string $t): array
    {
        $found = [];
        foreach (self::AMENITY_KEYWORDS as $name => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($t, $kw)) {
                    $found[] = $name;
                    break;
                }
            }
        }

        return $found;
    }

    /** @return array{check_in?: string, check_out?: string, nights?: int} */
    private function dates(string $t): array
    {
        $today = CarbonImmutable::today();
        $found = [];

        if (preg_match('/послезавтра/u', $t)) {
            $found[] = $today->addDays(2);
        } elseif (preg_match('/завтра/u', $t)) {
            $found[] = $today->addDay();
        } elseif (preg_match('/сегодня/u', $t)) {
            $found[] = $today;
        }

        if (preg_match('/выходн/u', $t)) {
            $saturday = $today->next(CarbonImmutable::SATURDAY);
            if ($today->isFriday()) {
                $saturday = $today;
            }

            return ['check_in' => $saturday->toDateString(), 'check_out' => $saturday->addDays(2)->toDateString(), 'nights' => 2];
        }

        $monthRegex = implode('|', array_keys(self::MONTHS));

        // «с 12 по 15 декабря», «12-15 декабря»
        if (preg_match('/(\d{1,2})\s*(?:-|—|–|по|до)\s*(\d{1,2})\s+('.$monthRegex.')[а-я]*/u', $t, $m)) {
            $month = $this->monthNumber($m[3]);
            $found = [$this->makeDate((int) $m[1], $month), $this->makeDate((int) $m[2], $month)];
        } else {
            // «12 декабря»
            if (preg_match_all('/(\d{1,2})\s+('.$monthRegex.')[а-я]*/u', $t, $mm, PREG_SET_ORDER)) {
                foreach ($mm as $m) {
                    $found[] = $this->makeDate((int) $m[1], $this->monthNumber($m[2]));
                }
            }
            // «12.12», «12.12.2026», «2026-12-12»
            if (preg_match_all('/\b(\d{4})-(\d{2})-(\d{2})\b/u', $t, $mm, PREG_SET_ORDER)) {
                foreach ($mm as $m) {
                    $found[] = CarbonImmutable::create((int) $m[1], (int) $m[2], (int) $m[3]);
                }
            }
            if (preg_match_all('/\b(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?\b/u', $t, $mm, PREG_SET_ORDER)) {
                foreach ($mm as $m) {
                    if ((int) $m[2] >= 1 && (int) $m[2] <= 12) {
                        $year = isset($m[3]) ? (int) (strlen($m[3]) === 2 ? '20'.$m[3] : $m[3]) : null;
                        $found[] = $this->makeDate((int) $m[1], (int) $m[2], $year);
                    }
                }
            }
        }

        $found = array_values(array_filter($found));
        $result = [];

        if (preg_match('/на\s+(\d{1,2})\s*(ноч|сут|дн|день|дня)/u', $t, $m)
            || preg_match('/(\d{1,2})\s*(ноч|сут)/u', $t, $m)) {
            $result['nights'] = max(1, min(30, (int) $m[1]));
        } elseif (preg_match('/на\s+(одну\s+)?ночь|на\s+сутки/u', $t)) {
            $result['nights'] = 1;
        } elseif (preg_match('/на\s+недел/u', $t)) {
            $result['nights'] = 7;
        }

        if (isset($found[0])) {
            $result['check_in'] = $found[0]->toDateString();
            if (isset($found[1]) && $found[1]->gt($found[0])) {
                $result['check_out'] = $found[1]->toDateString();
                $result['nights'] = (int) $found[0]->diffInDays($found[1]);
            } elseif (isset($result['nights'])) {
                $result['check_out'] = $found[0]->addDays($result['nights'])->toDateString();
            }
        }

        return $result;
    }

    private function monthNumber(string $word): int
    {
        foreach (self::MONTHS as $stem => $n) {
            if (preg_match('/^'.$stem.'/u', $word)) {
                return $n;
            }
        }

        return 1;
    }

    private function makeDate(int $day, int $month, ?int $year = null): ?CarbonImmutable
    {
        $today = CarbonImmutable::today();
        $yearGiven = $year !== null;
        $year ??= $today->year;

        if (! checkdate($month, $day, $year)) {
            return null;
        }

        $date = CarbonImmutable::create($year, $month, $day);
        if ($date->lt($today) && ! $yearGiven) {
            $date = $date->addYear(); // «5 января» в ноябре — значит следующего года
        }

        return $date;
    }
}
