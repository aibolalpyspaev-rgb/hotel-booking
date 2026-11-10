# StayEasy — веб-сервис бронирования номеров отелей с AI-помощником

Курсовой проект: Laravel 12 REST API + React (Vite) + MySQL + интеллектуальный помощник Hotel Assistant.

## Быстрый запуск (Windows)

Дважды кликните **`ЗАПУСТИТЬ САЙТ.bat`**. Скрипт сам:

1. Запустит MySQL 8.0 (порт **3307**, данные хранятся в папке `database-mysql`).
2. Создаст базы `hotel_booking` и `hotel_booking_test`.
3. Установит зависимости, применит миграции и при первом запуске заполнит базу тестовыми данными.
4. Запустит Laravel API (`http://127.0.0.1:8000/api`) и React (`http://localhost:5173`).
5. Откроет сайт в браузере.

Чтобы остановить сайт — нажмите любую клавишу в окне запуска или запустите **`ОСТАНОВИТЬ САЙТ.bat`**.

**Требования:** OSPanel в `C:\OSPanel` (используются PHP 8.3 и MySQL 8.0 из него) и Node.js 18+.
Пути к PHP/MySQL можно поменять в начале `ЗАПУСТИТЬ САЙТ.bat`.

### Тестовые аккаунты

| Роль | Email | Пароль |
|---|---|---|
| Администратор | admin@hotel.kz | admin123 |
| Пользователь | user@hotel.kz | user1234 |

Ещё 6 пользователей (`erlan@mail.kz`, `dana@mail.kz`, …) — пароль `user1234`.

## Ручной запуск

```bash
# Backend
cd backend
composer install
cp .env.example .env && php artisan key:generate   # укажите DB_* в .env
php artisan app:setup            # миграции + тестовые данные (если база пустая)
php artisan app:setup --fresh    # пересоздать базу с нуля
php artisan serve --port=8000

# Frontend
cd frontend
npm install
npm run dev                      # http://localhost:5173, /api проксируется на :8000
```

Тесты: `cd backend && php artisan test` (используется база `hotel_booking_test`, MySQL должен быть запущен) — 30 Feature-тестов.

## Структура

```
hotel-booking/
├── backend/                      Laravel 12
│   ├── app/Enums/                UserRole, BookingStatus, RoomType
│   ├── app/Exceptions/           BusinessException (ошибки бизнес-логики)
│   ├── app/Http/Controllers/Api/ контроллеры (+ Admin/)
│   ├── app/Http/Middleware/      EnsureUserHasRole (role:admin)
│   ├── app/Http/Requests/        Form Request валидация
│   ├── app/Http/Resources/       API Resources (формат JSON)
│   ├── app/Models/               User, Hotel, Room, Amenity, Booking, Review, ChatSession, ChatMessage
│   ├── app/Policies/             проверка владельца брони / отзыва
│   ├── app/Services/             BookingService, HotelService, RoomService, ReviewService,
│   │                             StatisticsService, AuthService, Chat/ (AI-помощник)
│   ├── database/migrations/      структура БД
│   ├── database/seeders/         тестовые данные
│   ├── routes/api.php            REST-маршруты
│   └── tests/Feature/            Feature-тесты
├── frontend/                     React + Vite + Tailwind
│   └── src/ components/ pages/ pages/admin/ layouts/ services/ hooks/ context/ utils/
├── ЗАПУСТИТЬ САЙТ.bat
└── ОСТАНОВИТЬ САЙТ.bat
```

## База данных

```
users ─┬─< bookings >── rooms >── hotels
       └─< reviews  >──────────── hotels
rooms >──< amenities   (промежуточная таблица room_amenity)
reviews ── bookings    (1 отзыв на 1 бронь)
chat_sessions ─< chat_messages
```

- `users` — name, email, phone, password (bcrypt), role (`user` / `admin`)
- `hotels` — name, city, address, description, stars, rating, image_url, gallery, is_active
- `rooms` — hotel_id, name, type, price_per_night, capacity, beds, area, is_active
- `bookings` — code, user_id, room_id, check_in, check_out, guests, nights, total_price, status
- `reviews` — user_id, hotel_id, booking_id, rating 1–5, comment
- индекс `bookings(room_id, status, check_in, check_out)` для быстрой проверки занятости

## Бизнес-логика бронирования (`app/Services/BookingService.php`)

- Даты: заезд не в прошлом, выезд позже заезда, не более 30 ночей.
- Гостей не больше вместимости номера.
- **Проверка занятости** через пересечение интервалов:
  `существующая.check_in < новая.check_out AND существующая.check_out > новая.check_in`
  (учитываются статусы `pending` и `confirmed`; день выезда может быть днём заезда следующего гостя).
- Создание выполняется в `DB::transaction()` с `SELECT … FOR UPDATE` по строке номера —
  два одновременных запроса на один номер выполняются строго по очереди, двойная бронь невозможна (HTTP 409).
- Защита от дублирующих бронирований одного пользователя.
- Стоимость = цена за ночь × количество ночей.
- Статусы: `pending` → `confirmed` (подтверждение — имитация оплаты) → `completed` (автоматически после выезда);
  `cancelled` — отмена пользователем не позднее чем за сутки до заезда или администратором.

**Демонстрация на защите:** войдите под `user@hotel.kz`, забронируйте номер на даты; затем войдите
под другим аккаунтом и попробуйте забронировать тот же номер на пересекающиеся даты — сервер вернёт
«Номер уже забронирован на выбранные даты». На странице номера также видны занятые даты.

## REST API

Все ответы в JSON. Ошибки в едином формате: `{ "success": false, "message": "...", "errors": { ... } }`.
Авторизация: заголовок `Authorization: Bearer <token>` (Laravel Sanctum).

| Метод | URL | Доступ | Описание |
|---|---|---|---|
| POST | /api/register | гость | регистрация, возвращает token |
| POST | /api/login | гость | вход |
| POST | /api/logout | user | выход |
| GET / PUT | /api/user | user | профиль / редактирование |
| GET | /api/hotels | все | поиск: `search, city, min_price, max_price, stars=4,5, min_rating, amenities=1,2, guests, check_in, check_out, sort, page, per_page` |
| GET | /api/hotels/{id} | все | отель с номерами и отзывами (`?check_in&check_out` — пометка свободных номеров) |
| POST / PUT / DELETE | /api/hotels[/{id}] | admin | управление отелями |
| GET | /api/rooms, /api/rooms/{id} | все | номера (фильтры: hotel_id, type, city, guests, цены, даты) |
| GET | /api/rooms/{id}/availability | все | проверка занятости + расчёт стоимости |
| POST / PUT / DELETE | /api/rooms[/{id}] | admin | управление номерами |
| GET | /api/bookings | user | мои бронирования (`?status=`) |
| GET | /api/bookings/{id} | владелец / admin | бронирование |
| POST | /api/bookings | user | создать бронь |
| PATCH | /api/bookings/{id}/confirm | владелец | подтвердить (имитация оплаты) |
| PATCH | /api/bookings/{id}/cancel | владелец / admin | отменить |
| GET | /api/reviews | все | отзывы (`hotel_id, rating, sort`) |
| POST | /api/reviews | user | отзыв по завершённой брони |
| PUT / DELETE | /api/reviews/{id} | автор (DELETE — и admin) | изменить / удалить |
| GET | /api/amenities | все | удобства |
| POST / PUT / DELETE | /api/amenities[/{id}] | admin | управление удобствами |
| GET | /api/cities, /api/stats | все | города, публичная статистика |
| POST | /api/chat | все | сообщение AI-помощнику `{ message, session_id }` |
| GET | /api/chat/{session_id} | все | история переписки |
| GET | /api/admin/stats | admin | статистика для панели |
| GET | /api/admin/bookings | admin | все бронирования |
| PATCH | /api/admin/bookings/{id}/status | admin | смена статуса |
| GET / PUT / DELETE | /api/admin/users[/{id}] | admin | пользователи и роли |

Пример:

```bash
curl -X POST http://127.0.0.1:8000/api/login -H "Content-Type: application/json" \
     -d '{"email":"user@hotel.kz","password":"user1234"}'
```

## AI-помощник Hotel Assistant

Плавающая кнопка в правом нижнем углу сайта → чат. Сервер (`app/Services/Chat/`):

- `MessageParser` — понимает запросы на русском: намерение, город, число гостей («на двоих»),
  бюджет («до 25000 тенге», «25к»), даты («с 20 по 23 декабря», «на выходные», «завтра на 2 ночи»),
  звёзды, удобства («с бассейном»).
- `ChatbotService` — помнит контекст диалога (хранится в `chat_sessions`), задаёт уточняющие вопросы
  (город, бюджет), ищет **реальные отели в БД** через `HotelService` с проверкой свободных дат,
  отвечает о бронировании, отмене, оплате, времени заезда и показывает бронирования пользователя.
- `ClaudeAssistant` — необязательное подключение языковой модели Claude: укажите `ANTHROPIC_API_KEY`
  в `backend/.env`. Ключ хранится только на сервере; модель лишь формулирует ответ по данным,
  найденным в БД. Без ключа (или при ошибке сети) работает встроенный алгоритм.

Пример диалога:
> — Мне нужен недорогой отель в Астане на двоих
> — Конечно! Ищу недорогой отель в городе Астана на двоих. Какой у вас бюджет за одну ночь?
> — До 25000 тенге
> — Я нашёл подходящие варианты… 1. Comfort Inn Astana (3★) — от 19 000 ₸ за ночь

## Безопасность

Sanctum-токены · bcrypt-хеширование паролей · middleware `role:admin` · политики владельца брони и отзыва ·
Form Request валидация всех входных данных · Eloquent / подготовленные запросы (защита от SQL-инъекций) ·
ограничение частоты запросов (throttle) на вход, регистрацию, бронирование и чат · CORS для фронтенда ·
корректные HTTP-коды (200, 201, 401, 403, 404, 409, 422, 429).
