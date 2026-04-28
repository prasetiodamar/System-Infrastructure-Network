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
        Schema::create('cores', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cable_id');
            $table->integer('core_number');
            $table->enum('status', ['available', 'allocated', 'spliced', 'damaged'])->default('available');
            $table->string('client_name')->nullable();
            $table->string('client_area')->nullable();
            $table->date('allocation_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('cable_id')->references('id')->on('cables')->onDelete('cascade');

            $table->index('cable_id');
            $table->unique(['cable_id', 'core_number']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cores');
    }
};
