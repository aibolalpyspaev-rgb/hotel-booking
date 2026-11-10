<?php

use App\Models\Hotel;
use App\Services\BookingService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
| app:setup — подготовка базы при запуске проекта:
| применяет миграции и заполняет тестовыми данными, если база пустая.
*/
Artisan::command('app:setup {--fresh : Пересоздать базу с нуля}', function () {
    if ($this->option('fresh')) {
        $this->call('migrate:fresh', ['--force' => true, '--seed' => true]);

        return;
    }

    $this->call('migrate', ['--force' => true]);

    if (Hotel::count() === 0) {
        $this->info('База пустая — заполняю тестовыми данными…');
        $this->call('db:seed', ['--force' => true]);
    }

    $this->info('База данных готова.');
})->purpose('Миграции + тестовые данные при первом запуске');

/* Завершение бронирований, у которых прошла дата выезда */
Artisan::command('bookings:complete', function (BookingService $bookings) {
    $this->info('Завершено бронирований: '.$bookings->completeFinished());
})->purpose('Перевести прошедшие подтверждённые брони в статус completed');

Schedule::command('bookings:complete')->daily();
