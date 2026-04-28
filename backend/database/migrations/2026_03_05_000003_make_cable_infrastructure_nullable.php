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
        // Make from_infrastructure_id and to_infrastructure_id nullable
        DB::statement('ALTER TABLE cables MODIFY COLUMN from_infrastructure_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE cables MODIFY COLUMN to_infrastructure_id BIGINT UNSIGNED NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE cables MODIFY COLUMN from_infrastructure_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE cables MODIFY COLUMN to_infrastructure_id BIGINT UNSIGNED NOT NULL');
    }
};
