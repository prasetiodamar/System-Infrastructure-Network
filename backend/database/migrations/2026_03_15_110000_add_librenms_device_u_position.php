<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            if (!Schema::hasColumn('infrastructures', 'librenms_device_u_position')) {
                $table->integer('librenms_device_u_position')->nullable()->after('librenms_hostname')->comment('U position for NMS assigned device');
            }
            if (!Schema::hasColumn('infrastructures', 'librenms_device_u_height')) {
                $table->integer('librenms_device_u_height')->default(1)->after('librenms_device_u_position')->comment('U height for NMS assigned device');
            }
        });
    }

    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->dropColumn(['librenms_device_u_position', 'librenms_device_u_height']);
        });
    }
};
