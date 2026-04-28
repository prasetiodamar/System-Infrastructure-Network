<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pigtails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('infrastructure_id')->constrained()->onDelete('cascade');
            $table->foreignId('splice_tray_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('port_number')->nullable(); // Which ODC port it connects to
            $table->string('color'); // e.g., "Blue", "Orange", "Green"
            $table->string('fiber_type')->default('SMF'); // SMF, MMF
            $table->decimal('length_m', 8, 2)->default(1.5); // Length in meters
            $table->enum('status', ['available', 'spliced', 'damaged'])->default('available');
            $table->foreignId('connected_splitter_id')->nullable()->constrained('splitters')->onDelete('set null');
            $table->foreignId('connected_splitter_port')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pigtails');
    }
};
