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
        Schema::table('cable_types', function (Blueprint $table) {
            $table->integer('tube_count')->default(1)->after('description');
            $table->integer('cores_per_tube')->default(12)->after('tube_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cable_types', function (Blueprint $table) {
            $table->dropColumn(['tube_count', 'cores_per_tube']);
        });
    }
};
