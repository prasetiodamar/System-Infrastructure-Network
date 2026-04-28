<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CableController;
use App\Http\Controllers\CableTypeController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\CoreController;
use App\Http\Controllers\InfrastructureController;
use App\Http\Controllers\InfrastructureTypeController;
use App\Http\Controllers\ConnectionController;
use App\Http\Controllers\SpliceController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\LibreNMSCategoryController;
use App\Http\Controllers\LibreNMSDeviceSiteController;
use App\Http\Controllers\PortController;
use App\Http\Controllers\SiteController;
use App\Http\Controllers\RackController;
use App\Http\Controllers\OdcTypeController;
use App\Http\Controllers\SplitterController;
use App\Http\Controllers\SplitterPortController;
use App\Http\Controllers\SpliceTrayController;
use App\Http\Controllers\PigtailController;
use App\Http\Controllers\OdcSpliceController;
use App\Http\Controllers\OdcPortConnectionController;
use App\Http\Controllers\OdpTypeController;
use App\Http\Controllers\KmlImportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// LibreNMS Proxy Routes (Public)
Route::get('/librenms/devices', function () {
    $url = 'https://librenms.gsmnet.co.id/api/v0/devices';
    $token = '228a6661effd8891fe93e91d36d302ad';

    try {
        $client = new \GuzzleHttp\Client([
            'verify' => false,
            'timeout' => 30,
        ]);

        $response = $client->get($url, [
            'headers' => [
                'X-Auth-Token' => $token,
            ],
        ]);

        return response()->json(json_decode($response->getBody()->getContents()));
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'url' => $url,
        ], 500);
    }
});

Route::get('/librenms/devices/{hostname}/ports', function ($hostname) {
    $url = 'https://librenms.gsmnet.co.id/api/v0/devices/' . $hostname . '/ports?columns=port_id,ifName,ifDescr,ifAlias,ifOperStatus,ifAdminStatus,ifSpeed,ifVlan,ifInOctets_rate,ifOutOctets_rate,ifInOctets,ifOutOctets';
    $token = '228a6661effd8891fe93e91d36d302ad';

    try {
        $client = new \GuzzleHttp\Client([
            'verify' => false,
            'timeout' => 30,
        ]);

        $response = $client->get($url, [
            'headers' => [
                'X-Auth-Token' => $token,
            ],
        ]);

        return response()->json(json_decode($response->getBody()->getContents()));
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'url' => $url,
        ], 500);
    }
});

// LibreNMS Sensors (Transceivers DDM)
Route::get('/librenms/devices/{hostname}/sensors', function ($hostname) {
    $url = 'https://librenms.gsmnet.co.id/api/v0/devices/' . $hostname . '/sensors';
    $token = '228a6661effd8891fe93e91d36d302ad';

    try {
        $client = new \GuzzleHttp\Client([
            'verify' => false,
            'timeout' => 30,
        ]);

        $response = $client->get($url, [
            'headers' => [
                'X-Auth-Token' => $token,
            ],
        ]);

        return response()->json(json_decode($response->getBody()->getContents()));
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'url' => $url,
        ], 500);
    }
});

// Import Locations from LibreNMS as Sites
Route::get('/librenms/import-locations', function () {
    $url = 'https://librenms.gsmnet.co.id/api/v0/devices';
    $token = '228a6661effd8891fe93e91d36d302ad';

    try {
        $client = new \GuzzleHttp\Client([
            'verify' => false,
            'timeout' => 30,
        ]);

        $response = $client->get($url, [
            'headers' => [
                'X-Auth-Token' => $token,
            ],
        ]);

        $data = json_decode($response->getBody()->getContents(), true);

        if (!isset($data['devices'])) {
            return response()->json(['error' => 'No devices found'], 400);
        }

        // Extract unique locations
        $locations = [];
        foreach ($data['devices'] as $device) {
            if (!empty($device['location'])) {
                $loc = $device['location'];
                $lat = isset($device['lat']) ? $device['lat'] : null;
                $lng = isset($device['lng']) ? $device['lng'] : null;

                if (!isset($locations[$loc])) {
                    $locations[$loc] = [
                        'name' => $loc,
                        'latitude' => $lat,
                        'longitude' => $lng,
                    ];
                }
            }
        }

        // Import to Sites table
        $imported = 0;
        $updated = 0;

        foreach ($locations as $locName => $locData) {
            // Clean name (remove coordinates in brackets)
            $cleanName = preg_replace('/\s*\[[-\d.,]+\]$/', '', $locName);
            $cleanName = trim($cleanName);

            if (empty($cleanName) || $cleanName === 'Unknown') {
                continue;
            }

            // Check if site exists
            $existingSite = \App\Models\Site::where('name', $cleanName)->first();

            if ($existingSite) {
                // Update if coordinates are empty
                if (empty($existingSite->latitude) && !empty($locData['latitude'])) {
                    $existingSite->latitude = $locData['latitude'];
                    $existingSite->longitude = $locData['longitude'];
                    $existingSite->save();
                    $updated++;
                }
            } else {
                // Generate code from first letters of each word (e.g., "POP Boyolali" -> "POPBOY")
                $words = explode(' ', $cleanName);
                $code = '';
                foreach ($words as $word) {
                    if (strlen($word) > 0) {
                        $code .= strtoupper(substr($word, 0, 3));
                    }
                }
                $code = substr($code, 0, 10); // Max 10 chars

                // Ensure unique
                $originalCode = $code;
                $counter = 1;
                while (\App\Models\Site::where('code', $code)->exists()) {
                    $code = $originalCode . $counter;
                    $counter++;
                }

                // Create new site
                \App\Models\Site::create([
                    'name' => $cleanName,
                    'code' => $code,
                    'latitude' => $locData['latitude'],
                    'longitude' => $locData['longitude'],
                    'status' => 'active',
                ]);
                $imported++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Imported $imported new sites, updated $updated existing sites",
            'total_locations' => count($locations),
            'imported' => $imported,
            'updated' => $updated,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
        ], 500);
    }
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Infrastructure Types
    Route::apiResource('infrastructure-types', InfrastructureTypeController::class);

    // ODC Types
    Route::apiResource('odc-types', OdcTypeController::class);

    // ODP Types
    Route::apiResource('odp-types', OdpTypeController::class);

    // Splitters
    Route::get('/infrastructures/{infrastructure}/splitters', [SplitterController::class, 'getByInfrastructure']);
    Route::apiResource('splitters', SplitterController::class);
    Route::get('/splitters/ratios', [SplitterController::class, 'getRatios']);

    // Splitter Port Allocation (ODC to ODP)
    Route::get('/splitters/available-odps', [SplitterController::class, 'getAvailableOdps']);
    Route::post('/splitters/odp', [SplitterController::class, 'createOdp']);
    Route::post('/splitters/{splitter}/ports/{splitterPort}/allocate-odp', [SplitterController::class, 'allocatePortToOdp']);

    // Splitter Port Allocation (ODP to Client)
    Route::get('/splitters/available-clients', [SplitterController::class, 'getAvailableClients']);
    Route::post('/splitters/client', [SplitterController::class, 'createClient']);
    Route::post('/splitters/{splitter}/ports/{splitterPort}/allocate-client', [SplitterController::class, 'allocatePortToClient']);

    // Splitter Port Disconnect
    Route::post('/splitters/{splitter}/ports/{splitterPort}/disconnect', [SplitterController::class, 'disconnectPort']);
    Route::post('/splitters/{splitter}/ports/{splitterPort}/make-available', [SplitterController::class, 'makePortAvailable']);

    // Splitter Ports
    Route::get('/splitters/{splitter}/ports', [SplitterPortController::class, 'index']);
    Route::get('/splitters/{splitter}/ports/statistics', [SplitterPortController::class, 'statistics']);
    Route::put('/splitter-ports/{splitterPort}', [SplitterPortController::class, 'update']);
    Route::post('/splitter-ports/{splitterPort}/connect', [SplitterPortController::class, 'connect']);
    Route::post('/splitter-ports/{splitterPort}/disconnect', [SplitterPortController::class, 'disconnect']);
    Route::post('/splitter-ports/bulk-update', [SplitterPortController::class, 'bulkUpdate']);

    // ODC Port Connections (Physical connections at ODC ports)
    Route::get('/infrastructures/{infrastructure}/odc-port-connections', [OdcPortConnectionController::class, 'index']);
    Route::post('/infrastructures/{infrastructure}/odc-port-connections/splitter-input', [OdcPortConnectionController::class, 'connectSplitterInput']);
    Route::post('/infrastructures/{infrastructure}/odc-port-connections/splitter-output', [OdcPortConnectionController::class, 'connectSplitterOutput']);
    Route::post('/infrastructures/{infrastructure}/odc-port-connections/pigtail', [OdcPortConnectionController::class, 'connectPigtail']);
    Route::delete('/odc-port-connections/{odcPortConnection}', [OdcPortConnectionController::class, 'disconnect']);
    Route::put('/odc-port-connections/{odcPortConnection}', [OdcPortConnectionController::class, 'update']);
    Route::patch('/odc-port-connections/{odcPortConnection}', [OdcPortConnectionController::class, 'update']);
    Route::get('/infrastructures/{infrastructure}/odc-port-connections/available-splitters', [OdcPortConnectionController::class, 'getAvailableSplitters']);
    Route::get('/infrastructures/{infrastructure}/odc-port-connections/available-splitter-ports', [OdcPortConnectionController::class, 'getAvailableSplitterPorts']);
    Route::get('/odc-port-connections/available-odps', [OdcPortConnectionController::class, 'getAvailableOdps']);
    Route::get('/infrastructures/{infrastructure}/connected-odps', [OdcPortConnectionController::class, 'getConnectedOdps']);

    // Splice Trays (ODC)
    Route::get('/infrastructures/{infrastructure}/splice-trays', [SpliceTrayController::class, 'index']);
    Route::post('/infrastructures/{infrastructure}/splice-trays', [SpliceTrayController::class, 'store']);
    Route::put('/splice-trays/{spliceTray}', [SpliceTrayController::class, 'update']);
    Route::delete('/splice-trays/{spliceTray}', [SpliceTrayController::class, 'destroy']);

    // Pigtails (ODC)
    Route::get('/infrastructures/{infrastructure}/pigtails', [PigtailController::class, 'index']);
    Route::post('/infrastructures/{infrastructure}/pigtails', [PigtailController::class, 'store']);
    Route::put('/pigtails/{pigtail}', [PigtailController::class, 'update']);
    Route::post('/pigtails/{pigtail}/connect-splitter', [PigtailController::class, 'connectToSplitter']);
    Route::post('/pigtails/{pigtail}/disconnect-splitter', [PigtailController::class, 'disconnectFromSplitter']);
    Route::delete('/pigtails/{pigtail}', [PigtailController::class, 'destroy']);
    Route::get('/pigtails/colors', [PigtailController::class, 'getColors']);

    // ODC Splices (splicing feeder cable to pigtail)
    Route::get('/infrastructures/{infrastructure}/odc-splices', [OdcSpliceController::class, 'index']);
    Route::post('/infrastructures/{infrastructure}/odc-splices', [OdcSpliceController::class, 'store']);
    Route::put('/odc-splices/{odcSplice}', [OdcSpliceController::class, 'update']);
    Route::delete('/odc-splices/{odcSplice}', [OdcSpliceController::class, 'destroy']);

    // Cable Types
    Route::apiResource('cable-types', CableTypeController::class);

    // Infrastructures (CRUD)
    Route::get('/infrastructures/map/all', [InfrastructureController::class, 'allForMap']);
    Route::get('/infrastructures/site/{siteId}', [InfrastructureController::class, 'getBySite']);
    Route::get('/infrastructures/hierarchy/{siteId?}', [InfrastructureController::class, 'getHierarchy']);
    Route::get('/infrastructures/pops-with-children', [InfrastructureController::class, 'getPopsWithChildren']);
    Route::apiResource('infrastructures', InfrastructureController::class);
    Route::post('/infrastructures/{infrastructure}/image', [InfrastructureController::class, 'uploadImage']);
    Route::delete('/infrastructures/{infrastructure}/image', [InfrastructureController::class, 'deleteImage']);
    Route::get('/infrastructures/{infrastructure}/image/download', [InfrastructureController::class, 'downloadImage']);
    Route::get('/infrastructures/{infrastructure}/images', [InfrastructureController::class, 'getImages']);

    // Sites (CRUD)
    Route::get('/sites/map', [SiteController::class, 'map']);
    Route::get('/sites/tree/{id}', [SiteController::class, 'tree']);
    Route::get('/sites/statistics', [SiteController::class, 'statistics']);
    Route::post('/sites/{id}/recalculate-radius', [SiteController::class, 'recalculateRadius']);
    Route::apiResource('sites', SiteController::class);

    // Ports
    Route::get('/infrastructures/{infrastructure}/ports', [PortController::class, 'index']);
    Route::get('/infrastructures/{infrastructure}/ports/summary', [PortController::class, 'summary']);
    Route::post('/infrastructures/{infrastructure}/ports', [PortController::class, 'store']);
    Route::put('/ports/{port}', [PortController::class, 'update']);
    Route::delete('/ports/{port}', [PortController::class, 'destroy']);
    Route::post('/infrastructures/{infrastructure}/ports/bulk', [PortController::class, 'bulkUpdate']);
    Route::post('/ports/{port}/connect', [PortController::class, 'connectPort']);
    Route::post('/ports/{port}/disconnect', [PortController::class, 'disconnectPort']);

    // Racks
    Route::get('/racks', [RackController::class, 'index']);
    Route::get('/racks/{rack}', [RackController::class, 'show']);
    Route::get('/racks/{rack}/available-positions', [RackController::class, 'getAvailablePositions']);
    Route::post('/racks/{rack}/validate-position', [RackController::class, 'validatePosition']);

    // LibreNMS Device Categories
    Route::get('/librenms/categories', [LibreNMSCategoryController::class, 'index']);
    Route::put('/librenms/categories', [LibreNMSCategoryController::class, 'update']);
    Route::post('/librenms/categories/bulk', [LibreNMSCategoryController::class, 'bulkUpdate']);
    Route::delete('/librenms/categories/{deviceId}', [LibreNMSCategoryController::class, 'destroy']);

    // LibreNMS Device Sites
    Route::get('/librenms/device-sites', [LibreNMSDeviceSiteController::class, 'index']);
    Route::put('/librenms/device-sites', [LibreNMSDeviceSiteController::class, 'update']);
    Route::delete('/librenms/device-sites/{deviceId}', [LibreNMSDeviceSiteController::class, 'destroy']);

    // Cables
    Route::apiResource('cables', CableController::class);
    Route::get('/cables/{cable}/cores', [CableController::class, 'cores']);
    Route::get('/cables/{cable}/cores/summary', [CableController::class, 'coreSummary']);

    // Cores
    Route::put('/cores/{core}', [CoreController::class, 'update']);
    Route::post('/cables/{cable}/cores/bulk', [CoreController::class, 'bulkUpdate']);

    // Splices
    Route::get('/splices', [SpliceController::class, 'getAll']);
    Route::get('/infrastructures/{infrastructure}/splices', [SpliceController::class, 'index']);
    Route::post('/splices', [SpliceController::class, 'store']);
    Route::get('/splices/{splice}', [SpliceController::class, 'show']);
    Route::put('/splices/{splice}', [SpliceController::class, 'update']);
    Route::delete('/splices/{splice}', [SpliceController::class, 'destroy']);
    Route::post('/splices/trace-client', [SpliceController::class, 'traceClient']);
    Route::post('/splices/{splice}/image', [SpliceController::class, 'uploadImage']);
    Route::delete('/splices/{splice}/image', [SpliceController::class, 'deleteImage']);

    // Connections (CRUD)
    Route::apiResource('connections', ConnectionController::class);

    // Clients (Pelanggan)
    Route::apiResource('clients', ClientController::class);
    Route::get('/clients-for-map', [ClientController::class, 'forMap']);
    Route::get('/clients/statistics', [ClientController::class, 'statistics']);
    Route::post('/clients/{client}/connect', [ClientController::class, 'connect']);
    Route::delete('/clients/{client}/connections/{connection}', [ClientController::class, 'disconnect']);

    // KML Import (Admin only)
    Route::middleware('admin')->group(function () {
        Route::post('/kml/parse', [KmlImportController::class, 'parseKml']);
        Route::post('/kml/import', [KmlImportController::class, 'importLines']);
    });

    // Users (Admin only)
    Route::middleware('admin')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::apiResource('users', UserController::class);
    });
});
