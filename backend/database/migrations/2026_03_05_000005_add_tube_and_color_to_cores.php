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
        Schema::table('cores', function (Blueprint $table) {
            $table->integer('tube_number')->nullable()->after('core_number');
            $table->string('fiber_color')->nullable()->after('tube_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cores', function (Blueprint $table) {
            $table->dropColumn(['tube_number', 'fiber_color']);
        });
    }
};
