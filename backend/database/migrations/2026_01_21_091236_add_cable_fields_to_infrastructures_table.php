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
            $table->json('path_coordinates')->nullable()->after('longitude');
            $table->decimal('cable_length', 10, 2)->nullable()->after('path_coordinates')->comment('Cable length in meters');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->dropColumn(['path_coordinates', 'cable_length']);
        });
    }
};
