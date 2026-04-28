<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->foreignId('odp_type_id')->nullable()->after('odc_type_id')->constrained('odp_types')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->dropForeign(['odp_type_id']);
            $table->dropColumn('odp_type_id');
        });
    }
};
