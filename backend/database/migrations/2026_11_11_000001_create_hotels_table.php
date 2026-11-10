<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotels', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city', 100)->index();
            $table->string('address');
            $table->text('description');
            $table->string('short_description', 300)->nullable();
            $table->unsignedTinyInteger('stars')->default(3)->index();
            $table->decimal('rating', 3, 2)->default(0)->index();
            $table->string('image_url', 500)->nullable();
            $table->json('gallery')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();
            $table->time('check_in_time')->default('14:00');
            $table->time('check_out_time')->default('12:00');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotels');
    }
};
