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
        // MySQL: modify enum values
        DB::statement("ALTER TABLE splices MODIFY COLUMN splice_type ENUM('otb', 'closure', 'tray', 'termination', 'odp', 'odc', 'rozet') DEFAULT 'closure'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE splices MODIFY COLUMN splice_type ENUM('closure', 'tray', 'termination') DEFAULT 'closure'");
    }
};
