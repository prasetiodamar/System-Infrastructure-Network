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
        Schema::create('cable_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type'); // Duct Cable, Aerial Cable, Dropcore, Figure 8, etc
            $table->integer('default_core_count');
            $table->text('description')->nullable();
            $table->string('color')->default('#607D8B'); // For map visualization
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cable_types');
    }
};
