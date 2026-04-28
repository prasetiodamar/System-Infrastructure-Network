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
        Schema::create('splices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('joint_box_infrastructure_id');
            $table->unsignedBigInteger('cable_1_id');
            $table->integer('cable_1_core');
            $table->unsignedBigInteger('cable_2_id');
            $table->integer('cable_2_core');
            $table->enum('splice_type', ['closure', 'tray', 'termination'])->default('closure');
            $table->date('splice_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('joint_box_infrastructure_id')->references('id')->on('infrastructures')->onDelete('cascade');
            $table->foreign('cable_1_id')->references('id')->on('cables')->onDelete('cascade');
            $table->foreign('cable_2_id')->references('id')->on('cables')->onDelete('cascade');

            $table->index('joint_box_infrastructure_id');
            $table->index('cable_1_id');
            $table->index('cable_2_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('splices');
    }
};
