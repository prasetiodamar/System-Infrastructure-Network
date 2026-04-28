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
        Schema::create('connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_infrastructure_id')->constrained('infrastructures')->onDelete('cascade');
            $table->foreignId('to_infrastructure_id')->constrained('infrastructures')->onDelete('cascade');
            $table->string('type'); // 'fiber', 'copper', 'wireless', etc
            $table->decimal('distance', 8, 2)->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive', 'damaged'])->default('active');
            $table->json('route_coordinates')->nullable(); // GeoJSON array for polyline
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('connections');
    }
};
