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
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('description');
            $table->string('image_name')->nullable()->after('image_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->dropColumn(['image_path', 'image_name']);
        });
    }
};
