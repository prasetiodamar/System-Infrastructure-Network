<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CableTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cableTypes = [
            [
                'name' => 'Duct Cable 12 Core',
                'type' => 'Duct Cable',
                'default_core_count' => 12,
                'description' => 'Underground duct cable with 12 cores',
                'color' => '#2196F3',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Duct Cable 24 Core',
                'type' => 'Duct Cable',
                'default_core_count' => 24,
                'description' => 'Underground duct cable with 24 cores',
                'color' => '#1976D2',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Duct Cable 48 Core',
                'type' => 'Duct Cable',
                'default_core_count' => 48,
                'description' => 'Underground duct cable with 48 cores',
                'color' => '#0D47A1',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Direct Buried 12 Core',
                'type' => 'Direct Buried Cable',
                'default_core_count' => 12,
                'description' => 'Direct buried cable with 12 cores',
                'color' => '#4CAF50',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Aerial Cable 12 Core',
                'type' => 'Aerial Cable',
                'default_core_count' => 12,
                'description' => 'Aerial cable with 12 cores',
                'color' => '#FF9800',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Dropcore 6 Core',
                'type' => 'Dropcore',
                'default_core_count' => 6,
                'description' => 'Drop cable with 6 cores',
                'color' => '#9C27B0',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Dropcore 12 Core',
                'type' => 'Dropcore',
                'default_core_count' => 12,
                'description' => 'Drop cable with 12 cores',
                'color' => '#BA68C8',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Dropcore Tube 6 Core',
                'type' => 'Dropcore Tube',
                'default_core_count' => 6,
                'description' => 'Dropcore tube with 6 cores',
                'color' => '#7B1FA2',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Figure 8 12 Core',
                'type' => 'Figure 8',
                'default_core_count' => 12,
                'description' => 'Figure 8 cable with 12 cores',
                'color' => '#E91E63',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Figure 8 24 Core',
                'type' => 'Figure 8',
                'default_core_count' => 24,
                'description' => 'Figure 8 cable with 24 cores',
                'color' => '#C2185B',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Mini ADSS 12 Core',
                'type' => 'Mini ADSS',
                'default_core_count' => 12,
                'description' => 'Mini ADSS cable with 12 cores',
                'color' => '#3F51B5',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ADSS 24 Core',
                'type' => 'ADSS',
                'default_core_count' => 24,
                'description' => 'ADSS cable with 24 cores',
                'color' => '#303F9F',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ADSS 48 Core',
                'type' => 'ADSS',
                'default_core_count' => 48,
                'description' => 'ADSS cable with 48 cores',
                'color' => '#1A237E',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'SCPT 12 Core',
                'type' => 'SCPT',
                'default_core_count' => 12,
                'description' => 'Self-supporting cable with 12 cores',
                'color' => '#00BCD4',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Indoor Cable 12 Core',
                'type' => 'Indoor Cable',
                'default_core_count' => 12,
                'description' => 'Indoor cable with 12 cores',
                'color' => '#FF5722',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('cable_types')->insert($cableTypes);
    }
}
