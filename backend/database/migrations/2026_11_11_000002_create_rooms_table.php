<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 30)->index(); // standard, comfort, deluxe, suite, family
            $table->text('description')->nullable();
            $table->unsignedInteger('price_per_night')->index(); // в тенге
            $table->unsignedTinyInteger('capacity')->index();
            $table->unsignedTinyInteger('beds')->default(1);
            $table->unsignedSmallInteger('area')->nullable(); // м²
            $table->string('image_url', 500)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
