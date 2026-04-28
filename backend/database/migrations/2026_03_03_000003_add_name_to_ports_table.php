<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ports', function (Blueprint $table) {
            $table->string('name')->nullable()->after('port_number')->comment('Port name like PON-1, GE-1, etc');
        });
    }

    public function down(): void
    {
        Schema::table('ports', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }
};
