<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if MySQL and update enum values
        DB::statement("ALTER TABLE infrastructure_types MODIFY COLUMN category ENUM('rack', 'otb', 'odc', 'odp', 'joint_box', 'server', 'router', 'switch', 'tiang', 'olt', 'other') DEFAULT 'otb'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE infrastructure_types MODIFY COLUMN category ENUM('rack', 'otb', 'odc', 'odp', 'joint_box', 'server', 'router', 'switch', 'tiang') DEFAULT 'otb'");
    }
};
