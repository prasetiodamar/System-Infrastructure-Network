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
        Schema::table('ports', function (Blueprint $table) {
            // Port connection type
            $table->enum('port_type', ['copper', 'fiber', 'sfp', 'sfp_plus', 'qsfp', 'rj45'])->default('copper')->after('port_number')->comment('Physical port type');

            // Connection ke port lain (port-to-port connection)
            $table->unsignedBigInteger('connected_port_id')->nullable()->after('status')->comment('Connected to another port');
            $table->foreign('connected_port_id')->references('id')->on('ports')->onDelete('SET NULL');

            // Connection details
            $table->enum('connection_type', ['fiber', 'copper', 'wireless'])->nullable()->after('connected_port_id')->comment('Type of connection');
            $table->decimal('cable_length_m', 8, 2)->nullable()->after('connection_type')->comment('Cable length in meters');
            $table->string('cable_label')->nullable()->after('cable_length_m')->comment('Cable label/identifier');

            // Indexes
            $table->index('connected_port_id');
            $table->index(['infrastructure_id', 'port_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ports', function (Blueprint $table) {
            $table->dropIndex(['infrastructure_id', 'port_number']);
            $table->dropIndex('connected_port_id');

            $table->dropForeign(['connected_port_id']);
            $table->dropColumn([
                'port_type',
                'connected_port_id',
                'connection_type',
                'cable_length_m',
                'cable_label'
            ]);
        });
    }
};
