<?php

use App\Exceptions\BusinessException;
use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport([BusinessException::class]);

        // Для API всегда отдаём JSON
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        // Единый формат ошибок: { success: false, message: "...", errors?: {...} }
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Проверьте правильность заполнения полей.',
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['success' => false, 'message' => 'Требуется авторизация.'], 401);
            }
        });

        $exceptions->render(function (BusinessException $e, Request $request) {
            return response()->json(array_filter([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors() ?: null,
            ], fn ($v) => $v !== null), $e->status());
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($request->is('api/*')) {
                $status = $e->getStatusCode();
                $message = match ($status) {
                    403 => 'Доступ запрещён.',
                    404 => 'Запрашиваемый ресурс не найден.',
                    405 => 'Метод не поддерживается.',
                    429 => 'Слишком много запросов. Попробуйте позже.',
                    default => $e->getMessage() ?: 'Ошибка запроса.',
                };

                return response()->json(['success' => false, 'message' => $message], $status, $e->getHeaders());
            }
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') && ! config('app.debug')) {
                return response()->json(['success' => false, 'message' => 'Внутренняя ошибка сервера.'], 500);
            }
        });
    })->create();
