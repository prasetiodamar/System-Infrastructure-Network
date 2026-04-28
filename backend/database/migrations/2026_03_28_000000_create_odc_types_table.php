<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('odc_types', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., "24 Port", "48 Port", "96 Port"
            $table->integer('port_count'); // e.g., 24, 48, 96
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('odc_types');
    }
};
