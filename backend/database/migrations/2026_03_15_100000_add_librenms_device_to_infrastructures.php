<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            if (!Schema::hasColumn('infrastructures', 'librenms_device_id')) {
                $table->integer('librenms_device_id')->nullable()->after('description')->comment('Link to LibreNMS device_id');
            }
            if (!Schema::hasColumn('infrastructures', 'librenms_hostname')) {
                $table->string('librenms_hostname')->nullable()->after('librenms_device_id')->comment('LibreNMS hostname for reference');
            }
        });
    }

    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->dropColumn(['librenms_device_id', 'librenms_hostname']);
        });
    }
};
