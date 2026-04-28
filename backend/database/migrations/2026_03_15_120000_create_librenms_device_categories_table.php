<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('librenms_device_categories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('librenms_device_id')->unique();
            $table->string('category')->nullable(); // router, switch, server, olt
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('librenms_device_categories');
    }
};
