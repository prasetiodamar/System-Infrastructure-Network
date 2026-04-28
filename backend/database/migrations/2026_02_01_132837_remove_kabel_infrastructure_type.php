<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get the Kabel infrastructure type ID
        $kabelType = DB::table('infrastructure_types')
            ->where('name', 'Kabel')
            ->first();

        if ($kabelType) {
            $kabelTypeId = $kabelType->id;

            // Delete all infrastructures with type Kabel
            DB::table('infrastructures')
                ->where('type_id', $kabelTypeId)
                ->delete();

            // Delete the Kabel type
            DB::table('infrastructure_types')
                ->where('id', $kabelTypeId)
                ->delete();

            echo "Kabel infrastructure type and all related infrastructures removed.\n";
        } else {
            echo "Kabel infrastructure type not found. Already removed.\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate Kabel type (rollback not recommended)
        DB::table('infrastructure_types')->insert([
            'id' => 1,
            'name' => 'Kabel',
            'description' => 'Cable/Fiber infrastructure for drawing cable routes on map',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
