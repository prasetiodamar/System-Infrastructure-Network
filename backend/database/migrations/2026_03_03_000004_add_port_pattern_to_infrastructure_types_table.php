<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('infrastructure_types', function (Blueprint $table) {
            $table->string('port_name_pattern')->nullable()->after('port_type')->comment('Pattern for port names: {port}, {group}, etc');
            $table->integer('port_groups')->nullable()->after('port_name_pattern')->comment('Number of port groups (for GTGH style)');
            $table->integer('ports_per_group')->nullable()->after('port_groups')->comment('Ports per group');
        });
    }

    public function down(): void
    {
        Schema::table('infrastructure_types', function (Blueprint $table) {
            $table->dropColumn(['port_name_pattern', 'port_groups', 'ports_per_group']);
        });
    }
};
