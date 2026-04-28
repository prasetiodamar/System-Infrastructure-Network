<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Check if column exists and has old enum values
        if (Schema::hasColumn('infrastructures', 'rack_type')) {
            // Get current column definition
            $columnType = DB::select("SHOW COLUMNS FROM infrastructures WHERE Field = 'rack_type'");

            if (!empty($columnType) && isset($columnType[0]->Type)) {
                $currentType = $columnType[0]->Type;

                // Check if 'outdoor' is already in the enum
                if (strpos($currentType, 'outdoor') === false) {
                    // MySQL enum modification - need to change to set or recreate column
                    // For simplicity, we'll allow any value now
                    DB::statement("ALTER TABLE infrastructures MODIFY COLUMN rack_type ENUM('floor_standing', 'wall_mount', 'open_frame', 'outdoor') NULL");
                }
            }
        }
    }

    public function down(): void
    {
        // Revert to original enum values
        if (Schema::hasColumn('infrastructures', 'rack_type')) {
            DB::statement("ALTER TABLE infrastructures MODIFY COLUMN rack_type ENUM('wall_mount', 'floor_standing', 'open_frame') NULL");
        }
    }
};
