<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('splitters', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., "Splitter 1", "SP-01"
            $table->foreignId('infrastructure_id')->constrained()->onDelete('cascade'); // Parent ODC
            $table->string('ratio'); // e.g., "1:2", "1:4", "1:8", "1:16", "1:32"
            $table->integer('port_count'); // Total output ports (2, 4, 8, 16, 32)
            $table->string('type')->default('box')->comment('box or rackmount');
            $table->string('location')->nullable()->comment('Physical location in ODC, e.g., "Rack 1 Position 2"');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['infrastructure_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('splitters');
    }
};
