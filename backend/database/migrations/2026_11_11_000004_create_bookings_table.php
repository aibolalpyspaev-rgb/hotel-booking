<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->date('check_in');
            $table->date('check_out');
            $table->unsignedTinyInteger('guests');
            $table->unsignedSmallInteger('nights');
            $table->unsignedInteger('price_per_night');
            $table->unsignedInteger('total_price');
            $table->string('status', 20)->default('pending')->index();
            $table->string('guest_name')->nullable();
            $table->string('guest_phone', 32)->nullable();
            $table->text('special_requests')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            // Индекс для быстрого поиска пересечений интервалов дат по номеру
            $table->index(['room_id', 'status', 'check_in', 'check_out']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
