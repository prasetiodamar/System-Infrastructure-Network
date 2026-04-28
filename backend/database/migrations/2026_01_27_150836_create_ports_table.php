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
        Schema::create('ports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('infrastructure_id');
            $table->integer('port_number');
            $table->string('client_name')->nullable();
            $table->string('client_area')->nullable();
            $table->date('allocation_date')->nullable();
            $table->enum('status', ['available', 'allocated', 'maintenance'])->default('available');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('infrastructure_id')->references('id')->on('infrastructures')->onDelete('cascade');
            $table->index('infrastructure_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ports');
    }
};
