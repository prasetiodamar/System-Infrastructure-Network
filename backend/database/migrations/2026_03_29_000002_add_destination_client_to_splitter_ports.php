<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('splitter_ports', function (Blueprint $table) {
            if (!Schema::hasColumn('splitter_ports', 'destination_client_id')) {
                $table->foreignId('destination_client_id')
                    ->nullable()
                    ->after('destination_infrastructure_id')
                    ->constrained('clients')
                    ->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('splitter_ports', function (Blueprint $table) {
            if (Schema::hasColumn('splitter_ports', 'destination_client_id')) {
                $table->dropForeign(['destination_client_id']);
                $table->dropColumn('destination_client_id');
            }
        });
    }
};
