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
        Schema::table('infrastructures', function (Blueprint $table) {
            // Add parent_id for self-referencing hierarchy (parent-child relationship)
            $table->unsignedBigInteger('parent_id')->nullable()->after('type_id');
            $table->foreign('parent_id')->references('id')->on('infrastructures')->onDelete('SET NULL');
            $table->index('parent_id');

            // Add site_id for site grouping
            $table->unsignedBigInteger('site_id')->nullable()->after('parent_id');
            $table->foreign('site_id')->references('id')->on('sites')->onDelete('SET NULL');
            $table->index('site_id');

            // Add hierarchy_level for quick filtering
            $table->enum('hierarchy_level', ['pop', 'distribution', 'access'])->default('access')->after('site_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropIndex(['parent_id']);
            $table->dropColumn('parent_id');

            $table->dropForeign(['site_id']);
            $table->dropIndex(['site_id']);
            $table->dropColumn('site_id');

            $table->dropColumn('hierarchy_level');
        });
    }
};
