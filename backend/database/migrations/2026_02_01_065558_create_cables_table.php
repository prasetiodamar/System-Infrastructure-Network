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
        Schema::create('cables', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cable_type_id');
            $table->unsignedBigInteger('from_infrastructure_id');
            $table->unsignedBigInteger('to_infrastructure_id')->nullable();
            $table->string('name');
            $table->decimal('length', 10, 2)->default(0);
            $table->integer('core_count')->default(1);
            $table->string('brand')->nullable();
            $table->string('model_type')->nullable();
            $table->date('installation_date')->nullable();
            $table->enum('status', ['active', 'maintenance', 'decommissioned'])->default('active');
            $table->json('path_coordinates')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('cable_type_id')->references('id')->on('cable_types')->onDelete('restrict');
            $table->foreign('from_infrastructure_id')->references('id')->on('infrastructures')->onDelete('cascade');
            $table->foreign('to_infrastructure_id')->references('id')->on('infrastructures')->onDelete('cascade');

            $table->index('from_infrastructure_id');
            $table->index('to_infrastructure_id');
            $table->index('cable_type_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cables');
    }
};
