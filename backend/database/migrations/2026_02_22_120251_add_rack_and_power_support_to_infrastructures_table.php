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
            // Rack assignment
            if (!Schema::hasColumn('infrastructures', 'rack_id')) {
                $table->unsignedBigInteger('rack_id')->nullable()->after('site_id');
                $table->foreign('rack_id')->references('id')->on('infrastructures')->onDelete('SET NULL');
            }

            // Rack position (dalam satuan U)
            if (!Schema::hasColumn('infrastructures', 'u_position')) {
                $table->integer('u_position')->nullable()->after('rack_id')->comment('Starting U position in rack');
            }

            if (!Schema::hasColumn('infrastructures', 'u_height')) {
                $table->integer('u_height')->nullable()->after('u_position')->comment('Device height in U (1U, 2U, etc)');
            }

            // Physical location
            if (!Schema::hasColumn('infrastructures', 'room')) {
                $table->string('room')->nullable()->after('u_height')->comment('Room name, e.g., Ruang Server');
            }

            if (!Schema::hasColumn('infrastructures', 'floor')) {
                $table->string('floor')->nullable()->after('room')->comment('Floor, e.g., Lantai 2');
            }

            // Rack-specific fields (hanya untuk type category='rack')
            if (!Schema::hasColumn('infrastructures', 'rack_height_u')) {
                $table->integer('rack_height_u')->nullable()->after('floor')->comment('Total rack height in U (42U, 22U, etc)');
            }

            if (!Schema::hasColumn('infrastructures', 'rack_type')) {
                $table->enum('rack_type', ['wall_mount', 'floor_standing', 'open_frame'])->nullable()->after('rack_height_u')->comment('Type of rack enclosure');
            }

            if (!Schema::hasColumn('infrastructures', 'rack_used_u')) {
                $table->integer('rack_used_u')->default(0)->after('rack_type')->comment('Currently used U space in rack');
            }

            if (!Schema::hasColumn('infrastructures', 'rack_max_power_w')) {
                $table->integer('rack_max_power_w')->nullable()->after('rack_used_u')->comment('Maximum power consumption in watts');
            }

            // Device power consumption
            if (!Schema::hasColumn('infrastructures', 'power_w')) {
                $table->integer('power_w')->nullable()->after('rack_max_power_w')->comment('Device power consumption in watts');
            }

            // Indexes for performance - only create if not exists
            if (!Schema::hasIndex('infrastructures', 'infrastructures_rack_id_u_position_index')) {
                $table->index(['rack_id', 'u_position']);
            }

            if (!Schema::hasIndex('infrastructures', 'infrastructures_rack_type_index')) {
                $table->index('rack_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('infrastructures', function (Blueprint $table) {
            // Drop foreign key first
            if (Schema::hasColumn('infrastructures', 'rack_id')) {
                $table->dropForeign(['rack_id']);
            }

            // Then drop indexes
            $table->dropIndex('infrastructures_rack_type_index');
            $table->dropIndex('infrastructures_rack_id_u_position_index');

            // Finally drop columns
            $columns = ['rack_id', 'u_position', 'u_height', 'room', 'floor', 'rack_height_u', 'rack_type', 'rack_used_u', 'rack_max_power_w', 'power_w'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('infrastructures', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
