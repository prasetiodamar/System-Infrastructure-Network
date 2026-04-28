<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->decimal('latitude', 10, 8)->nullable()->change();
            $table->decimal('longitude', 11, 8)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->decimal('latitude', 10, 8)->nullable(false)->change();
            $table->decimal('longitude', 11, 8)->nullable(false)->change();
        });
    }
};
