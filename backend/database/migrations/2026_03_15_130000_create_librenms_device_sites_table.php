<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('librenms_device_sites', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('librenms_device_id')->unique();
            $table->unsignedBigInteger('site_id')->nullable();
            $table->foreign('site_id')->references('id')->on('sites')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('librenms_device_sites');
    }
};
