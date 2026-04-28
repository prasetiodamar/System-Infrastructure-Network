<?php

namespace Database\Seeders;

use App\Models\InfrastructureType;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class InfrastructureTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Don't delete - update existing types or create new ones
        // This preserves foreign key relationships with existing infrastructures

        // Main types with complete configuration
        $types = [
            // Primary Site Infrastructure
            [
                'name' => 'POP',
                'icon_url' => '🏢',
                'description' => 'Point of Presence - dapat indoor atau outdoor',
                'category' => 'pop',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 0,
                'default_power_w' => 0,
            ],
            [
                'name' => 'Data Center',
                'icon_url' => '🏢',
                'description' => 'Data Center - selalu indoor',
                'category' => 'data_center',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 0,
                'default_power_w' => 0,
            ],

            // Rack Types - disederhanakan, tinggi (U) ditentukan di rack_height_u
            [
                'name' => 'Rack Floor Standing',
                'icon_url' => '🗄️',
                'description' => 'Floor standing rack - height determined by U value',
                'category' => 'rack',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 42,
                'default_power_w' => null,
            ],
            [
                'name' => 'Rack Wallmount',
                'icon_url' => '🗄️',
                'description' => 'Wall mounted rack - height determined by U value',
                'category' => 'rack',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 12,
                'default_power_w' => null,
            ],
            [
                'name' => 'Rack Open Frame',
                'icon_url' => '🗄️',
                'description' => 'Open frame rack - height determined by U value',
                'category' => 'rack',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 45,
                'default_power_w' => null,
            ],
            [
                'name' => 'Rack Outdoor',
                'icon_url' => '📦',
                'description' => 'Outdoor rack for POP outdoor',
                'category' => 'rack',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 0,
                'default_power_w' => null,
            ],

            // OTB Types
            [
                'name' => 'OTB 12 Port',
                'icon_url' => '📡',
                'description' => 'Optical Termination Box - 12 Port',
                'category' => 'otb',
                'default_ports' => 12,
                'port_type' => 'fiber',
                'default_u_height' => 1,
                'default_power_w' => 10,
            ],
            [
                'name' => 'OTB 24 Port',
                'icon_url' => '📡',
                'description' => 'Optical Termination Box - 24 Port',
                'category' => 'otb',
                'default_ports' => 24,
                'port_type' => 'fiber',
                'default_u_height' => 2,
                'default_power_w' => 15,
            ],
            [
                'name' => 'OTB 48 Port',
                'icon_url' => '📡',
                'description' => 'Optical Termination Box - 48 Port',
                'category' => 'otb',
                'default_ports' => 48,
                'port_type' => 'fiber',
                'default_u_height' => 2,
                'default_power_w' => 20,
            ],
            [
                'name' => 'OTB 96 Port',
                'icon_url' => '📡',
                'description' => 'Optical Termination Box - 96 Port',
                'category' => 'otb',
                'default_ports' => 96,
                'port_type' => 'fiber',
                'default_u_height' => 4,
                'default_power_w' => 30,
            ],

            // Server Types
            [
                'name' => 'Server 1U',
                'icon_url' => '🖥️',
                'description' => 'Rack Server 1U (Dell R650, HP DL360)',
                'category' => 'server',
                'default_ports' => 2,
                'port_type' => 'copper',
                'default_u_height' => 1,
                'default_power_w' => 500,
            ],
            [
                'name' => 'Server 2U',
                'icon_url' => '🖥️',
                'description' => 'Rack Server 2U (Dell R750, HP DL380)',
                'category' => 'server',
                'default_ports' => 4,
                'port_type' => 'copper',
                'default_u_height' => 2,
                'default_power_w' => 750,
            ],
            [
                'name' => 'Storage Server 4U',
                'icon_url' => '💾',
                'description' => 'Storage Server/NAS 4U',
                'category' => 'server',
                'default_ports' => 4,
                'port_type' => 'copper',
                'default_u_height' => 4,
                'default_power_w' => 1000,
            ],

            // Router Types
            [
                'name' => 'Router 1U',
                'icon_url' => '🔄',
                'description' => 'Router 1U (Cisco ISR, Mikrotik)',
                'category' => 'router',
                'default_ports' => 4,
                'port_type' => 'copper',
                'default_u_height' => 1,
                'default_power_w' => 100,
            ],
            [
                'name' => 'Router 2U',
                'icon_url' => '🔄',
                'description' => 'Router 2U (Cisco ASR, Juniper MX)',
                'category' => 'router',
                'default_ports' => 8,
                'port_type' => 'copper',
                'default_u_height' => 2,
                'default_power_w' => 300,
            ],
            [
                'name' => 'OLT Standard',
                'icon_url' => '📟',
                'description' => 'Optical Line Terminal Standard (ZTE C300, Huawei)',
                'category' => 'olt',
                'default_ports' => 16,
                'port_type' => 'fiber',
                'default_u_height' => 1,
                'default_power_w' => 150,
                'port_name_pattern' => 'PON-{port}',
                'port_groups' => null,
                'ports_per_group' => null,
            ],
            [
                'name' => 'OLT C320 GTGH 32 SFP+',
                'icon_url' => '📟',
                'description' => 'ZTE C320 GTGH 32 SFP+ (2 GTGH x 16 ports)',
                'category' => 'olt',
                'default_ports' => 32,
                'port_type' => 'fiber',
                'default_u_height' => 2,
                'default_power_w' => 200,
                'port_name_pattern' => 'PON 1/{group}/{port}',
                'port_groups' => 2,
                'ports_per_group' => 16,
            ],

            // Switch Types
            [
                'name' => 'Switch 24 Port',
                'icon_url' => '🔌',
                'description' => 'Switch 24 Port 1U (Cisco 2960, Juniper EX)',
                'category' => 'switch',
                'default_ports' => 24,
                'port_type' => 'copper',
                'default_u_height' => 1,
                'default_power_w' => 150,
            ],
            [
                'name' => 'Switch 48 Port',
                'icon_url' => '🔌',
                'description' => 'Switch 48 Port 1U',
                'category' => 'switch',
                'default_ports' => 48,
                'port_type' => 'copper',
                'default_u_height' => 1,
                'default_power_w' => 200,
            ],
            [
                'name' => 'Switch Core 2U',
                'icon_url' => '🔌',
                'description' => 'Core Switch 2U (Cisco Nexus, Juniper QFX)',
                'category' => 'switch',
                'default_ports' => 48,
                'port_type' => 'copper',
                'default_u_height' => 2,
                'default_power_w' => 400,
            ],

            // Outdoor Types (no rack assignment)
            [
                'name' => 'ODC',
                'icon_url' => '📦',
                'description' => 'Outdoor Distribution Cabinet',
                'category' => 'odc',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 0,
                'default_power_w' => 0,
            ],
            [
                'name' => 'ODP',
                'icon_url' => '🔵',
                'description' => 'Optical Distribution Point',
                'category' => 'odp',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 0,
                'default_power_w' => 0,
            ],
            [
                'name' => 'Joint Box',
                'icon_url' => '⬜',
                'description' => 'Connection Joint/Splice Box',
                'category' => 'joint_box',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 0,
                'default_power_w' => 0,
            ],
            [
                'name' => 'Tiang',
                'icon_url' => '🏗️',
                'description' => 'Pole/Tower',
                'category' => 'tiang',
                'default_ports' => 0,
                'port_type' => 'none',
                'default_u_height' => 0,
                'default_power_w' => 0,
            ],
        ];

        foreach ($types as $type) {
            $name = $type['name'];
            InfrastructureType::updateOrCreate(
                ['name' => $name],
                $type
            );
            $this->command->info("✓ Created/Updated infrastructure type: {$name}");
        }

        $this->command->info('');
        $this->command->info('✅ Infrastructure types seeded successfully!');
        $this->command->info('📊 Summary:');
        $this->command->info("  - Rack Types: 4");
        $this->command->info("  - OTB Types: 4");
        $this->command->info("  - Server Types: 3");
        $this->command->info("  - Router Types: 2");
        $this->command->info("  - Switch Types: 3");
        $this->command->info("  - Outdoor Types: 4");
        $this->command->info("  - Total: " . count($types));
    }
}
