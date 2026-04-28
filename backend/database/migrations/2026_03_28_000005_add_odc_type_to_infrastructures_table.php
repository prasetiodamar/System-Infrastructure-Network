<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            if (!Schema::hasColumn('infrastructures', 'odc_type_id')) {
                $table->foreignId('odc_type_id')->nullable()->after('type_id')->constrained('odc_types')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            if (Schema::hasColumn('infrastructures', 'odc_type_id')) {
                $table->dropForeign(['odc_type_id']);
                $table->dropColumn('odc_type_id');
            }
        });
    }
};
