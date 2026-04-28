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
        Schema::table('infrastructure_types', function (Blueprint $table) {
            // Category untuk grouping - only add if not exists
            if (!Schema::hasColumn('infrastructure_types', 'category')) {
                $table->enum('category', ['rack', 'otb', 'odc', 'odp', 'joint_box', 'server', 'router', 'switch', 'tiang', 'olt', 'other'])->default('otb')->after('name');
            }

            // Port configuration untuk auto-create ports
            if (!Schema::hasColumn('infrastructure_types', 'default_ports')) {
                $table->integer('default_ports')->default(0)->after('icon_url')->comment('Default number of ports for this type');
            }

            if (!Schema::hasColumn('infrastructure_types', 'port_type')) {
                $table->enum('port_type', ['copper', 'fiber', 'mixed', 'none'])->default('copper')->after('default_ports')->comment('Type of ports');
            }

            // Default device height in U
            if (!Schema::hasColumn('infrastructure_types', 'default_u_height')) {
                $table->integer('default_u_height')->default(1)->after('port_type')->comment('Default device height in rack units');
            }

            // Default power consumption
            if (!Schema::hasColumn('infrastructure_types', 'default_power_w')) {
                $table->integer('default_power_w')->nullable()->after('default_u_height')->comment('Default power consumption in watts');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('infrastructure_types', function (Blueprint $table) {
            $columns = ['category', 'default_ports', 'port_type', 'default_u_height', 'default_power_w'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('infrastructure_types', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
