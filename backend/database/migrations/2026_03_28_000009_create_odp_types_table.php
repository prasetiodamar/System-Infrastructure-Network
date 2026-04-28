<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('odp_types', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., "ODP 8 Port", "ODP 16 Port", "ODP 24 Port"
            $table->integer('port_count')->default(8);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Insert default ODP types
        DB::table('odp_types')->insert([
            ['name' => 'ODP 8 Port', 'port_count' => 8, 'description' => 'ODP dengan 8 port distribusi', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'ODP 12 Port', 'port_count' => 12, 'description' => 'ODP dengan 12 port distribusi', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'ODP 16 Port', 'port_count' => 16, 'description' => 'ODP dengan 16 port distribusi', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'ODP 24 Port', 'port_count' => 24, 'description' => 'ODP dengan 24 port distribusi', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'ODP 48 Port', 'port_count' => 48, 'description' => 'ODP dengan 48 port distribusi', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('odp_types');
    }
};
