<?php

namespace Database\Seeders;

use App\Models\OdcType;
use Illuminate\Database\Seeder;

class OdcTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'name' => 'ODC 24 Port',
                'port_count' => 24,
                'description' => 'Optical Distribution Cabinet with 24 ports',
                'is_active' => true,
            ],
            [
                'name' => 'ODC 48 Port',
                'port_count' => 48,
                'description' => 'Optical Distribution Cabinet with 48 ports',
                'is_active' => true,
            ],
            [
                'name' => 'ODC 96 Port',
                'port_count' => 96,
                'description' => 'Optical Distribution Cabinet with 96 ports',
                'is_active' => true,
            ],
        ];

        foreach ($types as $type) {
            OdcType::updateOrCreate(
                ['name' => $type['name']],
                $type
            );
        }
    }
}
