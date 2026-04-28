<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('splitter_ports', function (Blueprint $table) {
            // Add foreign key for destination_infrastructure_id if not exists
            if (!Schema::hasColumn('splitter_ports', 'destination_infrastructure_id')) {
                $table->foreignId('destination_infrastructure_id')->nullable()->constrained('infrastructures')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('splitter_ports', function (Blueprint $table) {
            if (Schema::hasColumn('splitter_ports', 'destination_infrastructure_id')) {
                $table->dropForeign(['destination_infrastructure_id']);
            }
        });
    }
};
