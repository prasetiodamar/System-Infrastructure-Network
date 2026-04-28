<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('splitter_ports', function (Blueprint $table) {
            $table->string('client_name', 255)->nullable()->after('notes');
            $table->string('client_area', 255)->nullable()->after('client_name');
        });
    }

    public function down(): void
    {
        Schema::table('splitter_ports', function (Blueprint $table) {
            $table->dropColumn(['client_name', 'client_area']);
        });
    }
};
