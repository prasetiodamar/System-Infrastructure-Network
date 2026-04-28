<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update cables table enum
        DB::statement("ALTER TABLE cables MODIFY COLUMN status ENUM('planned', 'installed', 'spliced', 'active', 'inactive', 'maintenance', 'damaged') DEFAULT 'active'");

        // Update cores table enum
        DB::statement("ALTER TABLE cores MODIFY COLUMN status ENUM('available', 'allocated', 'spliced', 'damaged', 'reserved') DEFAULT 'available'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert cables table enum
        DB::statement("ALTER TABLE cables MODIFY COLUMN status ENUM('active', 'maintenance', 'decommissioned') DEFAULT 'active'");

        // Revert cores table enum
        DB::statement("ALTER TABLE cores MODIFY COLUMN status ENUM('available', 'allocated', 'spliced', 'damaged') DEFAULT 'available'");
    }
};
