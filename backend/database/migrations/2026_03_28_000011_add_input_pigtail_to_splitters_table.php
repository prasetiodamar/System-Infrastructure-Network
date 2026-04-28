<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('splitters', function (Blueprint $table) {
            $table->foreignId('input_pigtail_id')->nullable()->after('is_active')->constrained('pigtails')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('splitters', function (Blueprint $table) {
            $table->dropForeign(['input_pigtail_id']);
            $table->dropColumn('input_pigtail_id');
        });
    }
};
