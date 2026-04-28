<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('odc_port_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('infrastructure_id')->constrained()->onDelete('cascade'); // ODC
            $table->foreignId('port_id')->constrained()->onDelete('cascade'); // Port di ODC
            $table->enum('connection_type', ['pigtail', 'splitter_input', 'splitter_output']);
            $table->foreignId('pigtail_id')->nullable()->constrained('pigtails')->onDelete('set null');
            $table->foreignId('splitter_id')->nullable()->constrained('splitters')->onDelete('set null');
            $table->foreignId('splitter_port_id')->nullable()->constrained('splitter_ports')->onDelete('set null');
            $table->integer('position')->comment('A=1 atau B=2'); // max 2 per port
            $table->text('notes')->nullable();
            $table->timestamps();

            // Unique constraint: 1 port ODC hanya bisa punya max 2 koneksi (position A & B)
            $table->unique(['port_id', 'position']);

            // Index untuk query cepat
            $table->index(['infrastructure_id', 'connection_type']);
            $table->index(['splitter_id', 'connection_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('odc_port_connections');
    }
};
