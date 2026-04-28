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
            $table->unsignedBigInteger('pop_id')->nullable()->after('type_id');
            $table->unsignedBigInteger('cable_id')->nullable()->after('pop_id');
            $table->json('used_cores')->nullable()->after('cable_id');

            $table->foreign('pop_id')->references('id')->on('infrastructures')->onDelete('set null');
            $table->foreign('cable_id')->references('id')->on('cables')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->dropForeign(['pop_id']);
            $table->dropForeign(['cable_id']);
            $table->dropColumn(['pop_id', 'cable_id', 'used_cores']);
        });
    }
};
