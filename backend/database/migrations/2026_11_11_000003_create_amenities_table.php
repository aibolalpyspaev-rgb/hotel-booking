<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('amenities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('icon', 50)->default('check');
            $table->timestamps();
        });

        Schema::create('room_amenity', function (Blueprint $table) {
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('amenity_id')->constrained()->cascadeOnDelete();
            $table->primary(['room_id', 'amenity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_amenity');
        Schema::dropIfExists('amenities');
    }
};
