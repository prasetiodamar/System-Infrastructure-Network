<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('odc_splices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('infrastructure_id')->constrained()->onDelete('cascade'); // ODC
            $table->foreignId('splice_tray_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('pigtail_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('cable_id')->nullable()->constrained()->onDelete('set null'); // Feeder cable
            $table->integer('feeder_core_number')->nullable(); // Core from feeder cable
            $table->integer('pigtail_position')->nullable(); // Position in pigtail/splice tray
            $table->enum('splice_type', ['fusion', 'mechanical'])->default('fusion');
            $table->decimal('loss_db', 5, 2)->nullable(); // Splice loss in dB
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('odc_splices');
    }
};
