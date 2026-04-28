<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop existing foreign key constraint
        DB::statement('ALTER TABLE cables DROP FOREIGN KEY cables_cable_type_id_foreign');

        // Add new foreign key constraint pointing to correct table
        DB::statement('ALTER TABLE cables ADD CONSTRAINT cables_cable_type_id_foreign FOREIGN KEY (cable_type_id) REFERENCES cable_types(id) ON DELETE RESTRICT');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop new foreign key constraint
        DB::statement('ALTER TABLE cables DROP FOREIGN KEY cables_cable_type_id_foreign');

        // Restore old foreign key constraint
        DB::statement('ALTER TABLE cables ADD CONSTRAINT cables_cable_type_id_foreign FOREIGN KEY (cable_type_id) REFERENCES infrastructure_types(id) ON DELETE RESTRICT');
    }
};
