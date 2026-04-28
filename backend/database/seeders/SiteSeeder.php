<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Site;
use App\Models\Infrastructure;
use App\Models\InfrastructureType;

class SiteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get infrastructure types
        $popType = InfrastructureType::where('name', 'POP')->first();
        $otbType = InfrastructureType::where('name', 'OTB')->first();
        $odcType = InfrastructureType::where('name', 'ODC')->first();
        $odpType = InfrastructureType::where('name', 'ODP')->first();
        $serverType = InfrastructureType::where('name', 'Server')->first();
        $routerType = InfrastructureType::where('name', 'Router')->first();
        $switchType = InfrastructureType::where('name', 'Switch')->first();

        if (!$popType || !$otbType) {
            $this->command->warn('Infrastructure types not found. Please run infrastructure type seeder first.');
            return;
        }

        // Create Sites
        $sites = [
            [
                'name' => 'Solo Area',
                'code' => 'SOLO-01',
                'latitude' => -7.5617,
                'longitude' => 110.8164,
                'radius_km' => 10.0,
                'site_type' => 'building',
                'address' => 'Jl. Slamet Riyadi No. 1',
                'province' => 'Jawa Tengah',
                'city' => 'Solo',
                'district' => 'Jebres',
                'description' => 'Main coverage area for Solo city',
                'status' => 'active',
            ],
            [
                'name' => 'Sukoharjo Area',
                'code' => 'SKH-01',
                'latitude' => -7.6812,
                'longitude' => 110.8294,
                'radius_km' => 8.0,
                'site_type' => 'building',
                'address' => 'Jl. Jenderal Sudirman No. 1',
                'province' => 'Jawa Tengah',
                'city' => 'Sukoharjo',
                'district' => 'Sukoharjo',
                'description' => 'Coverage area for Sukoharjo regency',
                'status' => 'active',
            ],
            [
                'name' => 'Boyolali Area',
                'code' => 'BYL-01',
                'latitude' => -7.5154,
                'longitude' => 110.5985,
                'radius_km' => 12.0,
                'site_type' => 'building',
                'address' => 'Jl. Merapi No. 1',
                'province' => 'Jawa Tengah',
                'city' => 'Boyolali',
                'district' => 'Boyolali Kota',
                'description' => 'Coverage area for Boyolali regency',
                'status' => 'active',
            ],
        ];

        $createdSites = [];
        foreach ($sites as $site) {
            $createdSites[$site['code']] = Site::create($site);
            $this->command->info("✓ Created site: {$site['name']}");
        }

        // Create Infrastructure Hierarchy for SOLO-01
        $soloSite = $createdSites['SOLO-01'];

        // Level 1: POP
        $popSolo = Infrastructure::create([
            'type_id' => $popType->id,
            'name' => 'POP-SOLO-PUCANG',
            'latitude' => -7.58095260,
            'longitude' => 110.77006906,
            'description' => 'Main POP for Solo Pucang area',
            'status' => 'active',
            'site_id' => $soloSite->id,
            'parent_id' => null,
            'hierarchy_level' => 'pop',
        ]);
        $this->command->info("  ✓ Created POP: POP-SOLO-PUCANG");

        $popSoloJebres = Infrastructure::create([
            'type_id' => $popType->id,
            'name' => 'POP-SOLO-JEBRES',
            'latitude' => -7.5617,
            'longitude' => 110.8400,
            'description' => 'Main POP for Solo Jebres area',
            'status' => 'active',
            'site_id' => $soloSite->id,
            'parent_id' => null,
            'hierarchy_level' => 'pop',
        ]);
        $this->command->info("  ✓ Created POP: POP-SOLO-JEBRES");

        // Level 2: OTB (children of POP)
        $otbJabung01 = Infrastructure::create([
            'type_id' => $otbType->id,
            'name' => 'OTB-JABUNG-01',
            'latitude' => -7.5750,
            'longitude' => 110.7750,
            'description' => 'OTB Jabung 01 - Connected to POP Pucang',
            'status' => 'active',
            'site_id' => $soloSite->id,
            'parent_id' => $popSolo->id,
            'hierarchy_level' => 'distribution',
        ]);
        $this->command->info("    ✓ Created OTB: OTB-JABUNG-01 (child of POP-SOLO-PUCANG)");

        $otbJabung02 = Infrastructure::create([
            'type_id' => $otbType->id,
            'name' => 'OTB-JABUNG-02',
            'latitude' => -7.5800,
            'longitude' => 110.7850,
            'description' => 'OTB Jabung 02 - Connected to POP Pucang',
            'status' => 'active',
            'site_id' => $soloSite->id,
            'parent_id' => $popSolo->id,
            'hierarchy_level' => 'distribution',
        ]);
        $this->command->info("    ✓ Created OTB: OTB-JABUNG-02 (child of POP-SOLO-PUCANG)");

        $otbKentungan01 = Infrastructure::create([
            'type_id' => $otbType->id,
            'name' => 'OTB-KENTUNGAN-01',
            'latitude' => -7.5550,
            'longitude' => 110.8200,
            'description' => 'OTB Kentungan 01 - Connected to POP Jebres',
            'status' => 'active',
            'site_id' => $soloSite->id,
            'parent_id' => $popSoloJebres->id,
            'hierarchy_level' => 'distribution',
        ]);
        $this->command->info("    ✓ Created OTB: OTB-KENTUNGAN-01 (child of POP-SOLO-JEBRES)");

        // Level 3: ODP (children of OTB)
        $odpJabung01_01 = Infrastructure::create([
            'type_id' => $odpType->id,
            'name' => 'ODP-JABUNG-01-01',
            'latitude' => -7.5730,
            'longitude' => 110.7770,
            'description' => 'ODP Jabung 01-01 - Connected to OTB Jabung 01',
            'status' => 'active',
            'site_id' => $soloSite->id,
            'parent_id' => $otbJabung01->id,
            'hierarchy_level' => 'access',
        ]);
        $this->command->info("      ✓ Created ODP: ODP-JABUNG-01-01 (child of OTB-JABUNG-01)");

        $odpJabung01_02 = Infrastructure::create([
            'type_id' => $odpType->id,
            'name' => 'ODP-JABUNG-01-02',
            'latitude' => -7.5770,
            'longitude' => 110.7790,
            'description' => 'ODP Jabung 01-02 - Connected to OTB Jabung 01',
            'status' => 'active',
            'site_id' => $soloSite->id,
            'parent_id' => $otbJabung01->id,
            'hierarchy_level' => 'access',
        ]);
        $this->command->info("      ✓ Created ODP: ODP-JABUNG-01-02 (child of OTB-JABUNG-01)");

        $odpJabung02_01 = Infrastructure::create([
            'type_id' => $odpType->id,
            'name' => 'ODP-JABUNG-02-01',
            'latitude' => -7.5820,
            'longitude' => 110.7870,
            'description' => 'ODP Jabung 02-01 - Connected to OTB Jabung 02',
            'status' => 'active',
            'site_id' => $soloSite->id,
            'parent_id' => $otbJabung02->id,
            'hierarchy_level' => 'access',
        ]);
        $this->command->info("      ✓ Created ODP: ODP-JABUNG-02-01 (child of OTB-JABUNG-02)");

        // Server, Router, Switch in POP (Level 3 but directly under POP)
        if ($serverType) {
            Infrastructure::create([
                'type_id' => $serverType->id,
                'name' => 'SERVER-POP-PUCANG-01',
                'latitude' => -7.5810,
                'longitude' => 110.7705,
                'description' => 'Main Server in POP Pucang',
                'status' => 'active',
                'site_id' => $soloSite->id,
                'parent_id' => $popSolo->id,
                'hierarchy_level' => 'access',
            ]);
            $this->command->info("    ✓ Created SERVER: SERVER-POP-PUCANG-01 (child of POP-SOLO-PUCANG)");
        }

        if ($routerType) {
            Infrastructure::create([
                'type_id' => $routerType->id,
                'name' => 'ROUTER-POP-PUCANG-01',
                'latitude' => -7.5812,
                'longitude' => 110.7708,
                'description' => 'Main Router in POP Pucang',
                'status' => 'active',
                'site_id' => $soloSite->id,
                'parent_id' => $popSolo->id,
                'hierarchy_level' => 'access',
            ]);
            $this->command->info("    ✓ Created ROUTER: ROUTER-POP-PUCANG-01 (child of POP-SOLO-PUCANG)");
        }

        if ($switchType) {
            Infrastructure::create([
                'type_id' => $switchType->id,
                'name' => 'SWITCH-POP-PUCANG-01',
                'latitude' => -7.5814,
                'longitude' => 110.7710,
                'description' => 'Main Switch in POP Pucang',
                'status' => 'active',
                'site_id' => $soloSite->id,
                'parent_id' => $popSolo->id,
                'hierarchy_level' => 'access',
            ]);
            $this->command->info("    ✓ Created SWITCH: SWITCH-POP-PUCANG-01 (child of POP-SOLO-PUCANG)");
        }

        // Create Infrastructure Hierarchy for SUKOHARJO
        $skhSite = $createdSites['SKH-01'];

        $popSkh = Infrastructure::create([
            'type_id' => $popType->id,
            'name' => 'POP-SUKOHARJO-01',
            'latitude' => -7.6812,
            'longitude' => 110.8294,
            'description' => 'Main POP for Sukoharjo',
            'status' => 'active',
            'site_id' => $skhSite->id,
            'parent_id' => null,
            'hierarchy_level' => 'pop',
        ]);
        $this->command->info("  ✓ Created POP: POP-SUKOHARJO-01");

        $otbSkh01 = Infrastructure::create([
            'type_id' => $otbType->id,
            'name' => 'OTB-SUKOHARJO-01',
            'latitude' => -7.6780,
            'longitude' => 110.8250,
            'description' => 'OTB Sukoharjo 01',
            'status' => 'active',
            'site_id' => $skhSite->id,
            'parent_id' => $popSkh->id,
            'hierarchy_level' => 'distribution',
        ]);
        $this->command->info("    ✓ Created OTB: OTB-SUKOHARJO-01 (child of POP-SUKOHARJO-01)");

        $odpSkh01 = Infrastructure::create([
            'type_id' => $odpType->id,
            'name' => 'ODP-SUKOHARJO-01-01',
            'latitude' => -7.6790,
            'longitude' => 110.8270,
            'description' => 'ODP Sukoharjo 01-01',
            'status' => 'active',
            'site_id' => $skhSite->id,
            'parent_id' => $otbSkh01->id,
            'hierarchy_level' => 'access',
        ]);
        $this->command->info("      ✓ Created ODP: ODP-SUKOHARJO-01-01 (child of OTB-SUKOHARJO-01)");

        // Create Infrastructure Hierarchy for BOYOLALI
        $bylSite = $createdSites['BYL-01'];

        $popByl = Infrastructure::create([
            'type_id' => $popType->id,
            'name' => 'POP-BOYOLALI-01',
            'latitude' => -7.5154,
            'longitude' => 110.5985,
            'description' => 'Main POP for Boyolali',
            'status' => 'active',
            'site_id' => $bylSite->id,
            'parent_id' => null,
            'hierarchy_level' => 'pop',
        ]);
        $this->command->info("  ✓ Created POP: POP-BOYOLALI-01");

        $otbByl01 = Infrastructure::create([
            'type_id' => $otbType->id,
            'name' => 'OTB-BOYOLALI-01',
            'latitude' => -7.5120,
            'longitude' => 110.5950,
            'description' => 'OTB Boyolali 01',
            'status' => 'active',
            'site_id' => $bylSite->id,
            'parent_id' => $popByl->id,
            'hierarchy_level' => 'distribution',
        ]);
        $this->command->info("    ✓ Created OTB: OTB-BOYOLALI-01 (child of POP-BOYOLALI-01)");

        $odpByl01 = Infrastructure::create([
            'type_id' => $odpType->id,
            'name' => 'ODP-BOYOLALI-01-01',
            'latitude' => -7.5130,
            'longitude' => 110.5970,
            'description' => 'ODP Boyolali 01-01',
            'status' => 'active',
            'site_id' => $bylSite->id,
            'parent_id' => $otbByl01->id,
            'hierarchy_level' => 'access',
        ]);
        $this->command->info("      ✓ Created ODP: ODP-BOYOLALI-01-01 (child of OTB-BOYOLALI-01)");

        $this->command->info('');
        $this->command->info('✅ Dummy data created successfully!');
        $this->command->info('');
        $this->command->info('📊 Summary:');
        $this->command->info("  - Sites: " . count($sites));
        $this->command->info("  - POPs: 4 (2 in Solo, 1 in Sukoharjo, 1 in Boyolali)");
        $this->command->info("  - OTBs: 5");
        $this->command->info("  - ODPs: 5");
        $this->command->info("  - Servers/Routers/Switches: 3");
        $this->command->info("  - Total Infrastructures: " . Infrastructure::count());
    }
}
