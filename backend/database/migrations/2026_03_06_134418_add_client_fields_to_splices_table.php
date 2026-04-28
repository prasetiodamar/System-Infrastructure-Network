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
        Schema::table('splices', function (Blueprint $table) {
            $table->string('client_name')->nullable()->after('notes');
            $table->string('client_area')->nullable()->after('client_name');
            $table->unsignedBigInteger('source_otb_id')->nullable()->after('client_area');
            $table->string('source_otb_name')->nullable()->after('source_otb_id');
            $table->integer('source_port')->nullable()->after('source_otb_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('splices', function (Blueprint $table) {
            $table->dropColumn([
                'client_name',
                'client_area',
                'source_otb_id',
                'source_otb_name',
                'source_port',
            ]);
        });
    }
};
