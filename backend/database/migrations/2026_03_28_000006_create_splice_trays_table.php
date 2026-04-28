<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('splice_trays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('infrastructure_id')->constrained()->onDelete('cascade');
            $table->string('name'); // e.g., "Tray 1", "ST-01"
            $table->integer('max_splices')->default(12); // Max splices capacity
            $table->string('location')->nullable(); // Location in ODC
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['infrastructure_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('splice_trays');
    }
};
