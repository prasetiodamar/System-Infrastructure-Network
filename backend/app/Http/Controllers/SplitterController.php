<?php

namespace App\Http\Controllers;

use App\Models\Splitter;
use App\Models\Infrastructure;
use App\Models\InfrastructureType;
use App\Models\SplitterPort;
use App\Models\Cable;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SplitterController extends Controller
{
    /**
     * Get all splitters, optionally filtered by infrastructure
     */
    public function index(Request $request)
    {
        $query = Splitter::with(['infrastructure', 'ports', 'pigtail']);

        if ($request->has('infrastructure_id')) {
            $query->where('infrastructure_id', $request->infrastructure_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $splitters = $query->orderBy('name')->get();

        // Add computed attributes
        $splitters->each(function ($splitter) {
            $splitter->available_ports_count = $splitter->available_ports_count;
            $splitter->used_ports_count = $splitter->used_ports_count;
        });

        return response()->json($splitters);
    }

    /**
     * Get splitters for a specific infrastructure (ODC)
     */
    public function getByInfrastructure(Infrastructure $infrastructure)
    {
        $splitters = Splitter::with(['ports.cable', 'ports.destination', 'ports.port', 'pigtail'])
            ->where('infrastructure_id', $infrastructure->id)
            ->orderBy('name')
            ->get();

        // Add computed attributes
        $splitters->each(function ($splitter) {
            $splitter->available_ports_count = $splitter->available_ports_count;
            $splitter->used_ports_count = $splitter->used_ports_count;
        });

        return response()->json($splitters);
    }

    /**
     * Store a new splitter
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'infrastructure_id' => 'required|exists:infrastructures,id',
            'ratio' => 'required|in:1:2,1:4,1:8,1:16,1:32',
            'type' => 'sometimes|string|in:box,rackmount',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        // Get port count from ratio
        $ratioMap = ['1:2' => 2, '1:4' => 4, '1:8' => 8, '1:16' => 16, '1:32' => 32];
        $validated['port_count'] = $ratioMap[$validated['ratio']];

        DB::beginTransaction();
        try {
            $splitter = Splitter::create($validated);

            // Create ports automatically
            for ($i = 1; $i <= $splitter->port_count; $i++) {
                SplitterPort::create([
                    'splitter_id' => $splitter->id,
                    'port_number' => $i,
                    'status' => 'available',
                ]);
            }

            $splitter->load('ports');

            DB::commit();

            return response()->json($splitter, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get a single splitter with ports
     */
    public function show(Splitter $splitter)
    {
        $splitter->load(['infrastructure', 'ports.cable', 'ports.destination', 'ports.port', 'pigtail']);
        $splitter->available_ports_count = $splitter->available_ports_count;
        $splitter->used_ports_count = $splitter->used_ports_count;

        return response()->json($splitter);
    }

    /**
     * Update a splitter
     */
    public function update(Request $request, Splitter $splitter)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'ratio' => 'sometimes|required|in:1:2,1:4,1:8,1:16,1:32',
            'type' => 'sometimes|string|in:box,rackmount',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        // If ratio changes, we need to adjust ports
        if (isset($validated['ratio']) && $validated['ratio'] !== $splitter->ratio) {
            $ratioMap = ['1:2' => 2, '1:4' => 4, '1:8' => 8, '1:16' => 16, '1:32' => 32];
            $newPortCount = $ratioMap[$validated['ratio']];

            // Check if we can reduce ports (only if no ports are used)
            $usedPorts = $splitter->ports()->where('status', 'used')->count();
            if ($newPortCount < $splitter->port_count && $usedPorts > $newPortCount) {
                return response()->json([
                    'error' => 'Cannot reduce port count below used ports'
                ], 400);
            }

            // Add or remove ports as needed
            $currentPorts = $splitter->ports()->count();

            if ($newPortCount > $currentPorts) {
                // Add new ports
                for ($i = $currentPorts + 1; $i <= $newPortCount; $i++) {
                    SplitterPort::create([
                        'splitter_id' => $splitter->id,
                        'port_number' => $i,
                        'status' => 'available',
                    ]);
                }
            } elseif ($newPortCount < $currentPorts) {
                // Delete unused ports at the end
                $splitter->ports()
                    ->where('port_number', '>', $newPortCount)
                    ->where('status', 'available')
                    ->delete();
            }

            $validated['port_count'] = $newPortCount;
        }

        $splitter->update($validated);
        $splitter->load('ports');

        return response()->json($splitter);
    }

    /**
     * Delete a splitter
     */
    public function destroy(Splitter $splitter)
    {
        // Check if any ports are used
        $usedPorts = $splitter->ports()->where('status', '!=', 'available')->count();
        if ($usedPorts > 0) {
            return response()->json([
                'error' => 'Cannot delete splitter with active connections'
            ], 400);
        }

        // Delete ports first (cascade)
        $splitter->ports()->delete();
        $splitter->delete();

        return response()->json(null, 204);
    }

    /**
     * Get available ratios
     */
    public function getRatios()
    {
        return response()->json([
            ['value' => '1:2', 'label' => '1:2 (2 Ports)', 'port_count' => 2],
            ['value' => '1:4', 'label' => '1:4 (4 Ports)', 'port_count' => 4],
            ['value' => '1:8', 'label' => '1:8 (8 Ports)', 'port_count' => 8],
            ['value' => '1:16', 'label' => '1:16 (16 Ports)', 'port_count' => 16],
            ['value' => '1:32', 'label' => '1:32 (32 Ports)', 'port_count' => 32],
        ]);
    }

    /**
     * Connect a pigtail to splitter input
     */
    public function connectInput(Request $request, Splitter $splitter)
    {
        $validated = $request->validate([
            'pigtail_id' => 'required|exists:pigtails,id',
        ]);

        // Check if pigtail is already used by another splitter
        $existingSplitter = Splitter::where('input_pigtail_id', $validated['pigtail_id'])
            ->where('id', '!=', $splitter->id)
            ->first();

        if ($existingSplitter) {
            return response()->json([
                'error' => 'Pigtail ini sudah terhubung ke splitter lain: ' . $existingSplitter->name
            ], 400);
        }

        $splitter->update(['input_pigtail_id' => $validated['pigtail_id']]);
        $splitter->load(['ports.cable', 'ports.destination', 'ports.port', 'pigtail']);

        return response()->json($splitter);
    }

    /**
     * Disconnect pigtail from splitter input
     */
    public function disconnectInput(Splitter $splitter)
    {
        $splitter->update(['input_pigtail_id' => null]);
        $splitter->load(['ports.cable', 'ports.destination', 'ports.port', 'pigtail']);

        return response()->json($splitter);
    }

    /**
     * Get available ODPs for allocation
     */
    public function getAvailableOdps(Request $request)
    {
        $infrastructureId = $request->input('infrastructure_id');

        $query = Infrastructure::whereHas('type', function ($q) {
            $q->where('category', 'odp');
        });

        if ($infrastructureId) {
            // Exclude the current infrastructure (can't allocate to itself)
            $query->where('id', '!=', $infrastructureId);
        }

        // Exclude ODPs that are already allocated to another port
        $allocatedOdpIds = SplitterPort::whereNotNull('destination_infrastructure_id')
            ->pluck('destination_infrastructure_id')
            ->toArray();

        // If we have a specific port, exclude its current allocation
        if ($request->has('exclude_port_id')) {
            $excludePort = SplitterPort::find($request->exclude_port_id);
            if ($excludePort) {
                $allocatedOdpIds = array_filter($allocatedOdpIds, fn($id) => $id != $excludePort->destination_infrastructure_id);
            }
        }

        $odps = $query->whereNotIn('id', $allocatedOdpIds)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($odps);
    }

    /**
     * Create ODP on the fly
     */
    public function createOdp(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type_id' => 'nullable|exists:infrastructure_types,id',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'address' => 'nullable|string',
            'site_id' => 'nullable|exists:sites,id',
            'notes' => 'nullable|string',
        ]);

        // Find ODP type if not provided
        if (!isset($validated['type_id'])) {
            $odpType = InfrastructureType::where('category', 'odp')->first();
            if (!$odpType) {
                return response()->json(['error' => 'Tipe ODP tidak ditemukan'], 400);
            }
            $validated['type_id'] = $odpType->id;
        }

        $odp = Infrastructure::create($validated);

        return response()->json($odp, 201);
    }

    /**
     * Allocate splitter port to ODP (for ODC splitters)
     */
    public function allocatePortToOdp(Request $request, Splitter $splitter, SplitterPort $splitterPort)
    {
        // Validate port belongs to this splitter
        if ($splitterPort->splitter_id !== $splitter->id) {
            return response()->json(['error' => 'Port tidak принадлежит splitter ini'], 400);
        }

        $validated = $request->validate([
            'odp_id' => 'required_without:create_odp|exists:infrastructures,id',
            'create_odp' => 'required_without:odp_id|array',
            'create_odp.name' => 'required_with:create_odp|string|max:255',
            'create_odp.latitude' => 'nullable|numeric|between:-90,90',
            'create_odp.longitude' => 'nullable|numeric|between:-180,180',
            'create_odp.address' => 'nullable|string',
            'create_odp.site_id' => 'nullable|exists:sites,id',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $odpId = null;
            $odpName = null;

            // Check if creating new ODP or using existing
            if (isset($validated['create_odp'])) {
                // Create new ODP
                $odpType = InfrastructureType::where('category', 'odp')->first();
                if (!$odpType) {
                    return response()->json(['error' => 'Tipe ODP tidak ditemukan'], 400);
                }

                $newOdp = Infrastructure::create([
                    'name' => $validated['create_odp']['name'],
                    'type_id' => $odpType->id,
                    'latitude' => $validated['create_odp']['latitude'] ?? null,
                    'longitude' => $validated['create_odp']['longitude'] ?? null,
                    'site_id' => $validated['create_odp']['site_id'] ?? null,
                    'status' => 'active',
                ]);

                $odpId = $newOdp->id;
                $odpName = $newOdp->name;
            } else {
                $odpId = $validated['odp_id'];
                $odp = Infrastructure::find($odpId);
                $odpName = $odp->name;
            }

            // Check if ODP is already allocated to another port (conflict)
            $conflictingPort = SplitterPort::where('destination_infrastructure_id', $odpId)
                ->where('id', '!=', $splitterPort->id)
                ->first();

            if ($conflictingPort) {
                return response()->json([
                    'error' => 'ODP sudah dialokasikan ke port lain',
                    'conflicting_port' => [
                        'id' => $conflictingPort->id,
                        'port_number' => $conflictingPort->port_number,
                        'splitter_name' => $conflictingPort->splitter->name,
                    ],
                    'warning' => true,
                ], 409);
            }

            // Generate cable name: {ODC-name}-P{port-number}
            $odcName = $splitter->infrastructure->name ?? 'ODC';
            $cableName = $odcName . '-P' . $splitterPort->port_number;

            // Get default cable type (or first available)
            $cableTypeId = \App\Models\CableType::first()->id ?? null;

            // Create cable
            $cable = Cable::create([
                'name' => $cableName,
                'from_infrastructure_id' => $splitter->infrastructure_id,
                'to_infrastructure_id' => $odpId,
                'cable_type_id' => $cableTypeId,
                'status' => 'active',
                'notes' => 'Auto-generated cable from ODC splitter allocation',
            ]);

            // Update splitter port
            $splitterPort->update([
                'destination_infrastructure_id' => $odpId,
                'cable_id' => $cable->id,
                'status' => 'used',
                'notes' => $validated['notes'] ?? $splitterPort->notes,
            ]);

            // If there was a previous cable, keep it but mark it
            $splitterPort->load(['cable', 'destination', 'splitter']);

            DB::commit();

            return response()->json([
                'splitter_port' => $splitterPort,
                'cable' => $cable,
                'message' => 'Port berhasil dialokasikan ke ODP',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get available clients for allocation
     */
    public function getAvailableClients(Request $request)
    {
        $query = Client::query();

        // Filter by status if needed
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Exclude clients already allocated to another port
        $allocatedClientIds = SplitterPort::whereNotNull('destination_client_id')
            ->pluck('destination_client_id')
            ->toArray();

        // If we have a specific port, exclude its current allocation
        if ($request->has('exclude_port_id')) {
            $excludePort = SplitterPort::find($request->exclude_port_id);
            if ($excludePort) {
                $allocatedClientIds = array_filter($allocatedClientIds, fn($id) => $id != $excludePort->destination_client_id);
            }
        }

        $clients = $query->whereNotIn('id', $allocatedClientIds)
            ->orderBy('name')
            ->get(['id', 'name', 'address', 'status']);

        return response()->json($clients);
    }

    /**
     * Create client on the fly
     */
    public function createClient(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'package_type' => 'nullable|string|max:50',
            'monthly_fee' => 'nullable|numeric|min:0',
            'site_id' => 'nullable|exists:sites,id',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'active';

        $client = Client::create($validated);

        return response()->json($client, 201);
    }

    /**
     * Allocate splitter port to Client (for ODP splitters)
     */
    public function allocatePortToClient(Request $request, Splitter $splitter, SplitterPort $splitterPort)
    {
        // Validate port belongs to this splitter
        if ($splitterPort->splitter_id !== $splitter->id) {
            return response()->json(['error' => 'Port tidak принадлежит splitter ini'], 400);
        }

        $validated = $request->validate([
            'client_id' => 'required_without:create_client|exists:clients,id',
            'create_client' => 'required_without:client_id|array',
            'create_client.name' => 'required_with:create_client|string|max:255',
            'create_client.phone' => 'nullable|string|max:20',
            'create_client.email' => 'nullable|email|max:100',
            'create_client.address' => 'nullable|string',
            'create_client.package_type' => 'nullable|string|max:50',
            'create_client.monthly_fee' => 'nullable|numeric|min:0',
            'create_client.site_id' => 'nullable|exists:sites,id',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $clientId = null;
            $clientName = null;

            // Check if creating new client or using existing
            if (isset($validated['create_client'])) {
                // Create new client
                $newClient = Client::create([
                    'name' => $validated['create_client']['name'],
                    'phone' => $validated['create_client']['phone'] ?? null,
                    'email' => $validated['create_client']['email'] ?? null,
                    'address' => $validated['create_client']['address'] ?? null,
                    'package_type' => $validated['create_client']['package_type'] ?? null,
                    'monthly_fee' => $validated['create_client']['monthly_fee'] ?? null,
                    'site_id' => $validated['create_client']['site_id'] ?? null,
                    'status' => 'active',
                ]);

                $clientId = $newClient->id;
                $clientName = $newClient->name;
            } else {
                $clientId = $validated['client_id'];
                $client = Client::find($clientId);
                $clientName = $client->name;
            }

            // Check if client is already allocated to another port (conflict)
            $conflictingPort = SplitterPort::where('destination_client_id', $clientId)
                ->where('id', '!=', $splitterPort->id)
                ->first();

            if ($conflictingPort) {
                return response()->json([
                    'error' => 'Pelanggan sudah dialokasikan ke port lain',
                    'conflicting_port' => [
                        'id' => $conflictingPort->id,
                        'port_number' => $conflictingPort->port_number,
                        'splitter_name' => $conflictingPort->splitter->name,
                    ],
                    'warning' => true,
                ], 409);
            }

            // Update splitter port
            $splitterPort->update([
                'destination_client_id' => $clientId,
                'client_name' => $clientName,
                'status' => 'used',
                'notes' => $validated['notes'] ?? $splitterPort->notes,
            ]);

            // Also update client with splitter port reference
            Client::where('id', $clientId)->update(['splitter_port_id' => $splitterPort->id]);

            $splitterPort->load(['destinationClient', 'splitter']);

            DB::commit();

            return response()->json([
                'splitter_port' => $splitterPort,
                'message' => 'Port berhasil dialokasikan ke Pelanggan',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Disconnect splitter port allocation
     */
    public function disconnectPort(Splitter $splitter, SplitterPort $splitterPort)
    {
        // Validate port belongs to this splitter
        if ($splitterPort->splitter_id !== $splitter->id) {
            return response()->json(['error' => 'Port tidak принадлежит splitter ini'], 400);
        }

        $request = request();
        $force = $request->boolean('force', false);

        // Check for active connections
        $hasCableConnection = $splitterPort->cable_id !== null;
        $hasClientConnection = $splitterPort->destination_client_id !== null;

        if (($hasCableConnection || $hasClientConnection) && !$force) {
            return response()->json([
                'error' => 'Port memiliki koneksi aktif. Konfirmasi untuk memutus?',
                'has_cable' => $hasCableConnection,
                'has_client' => $hasClientConnection,
                'warning' => true,
            ], 409);
        }

        DB::beginTransaction();
        try {
            // Clear destination
            $splitterPort->update([
                'destination_infrastructure_id' => null,
                'destination_client_id' => null,
                'cable_id' => null,
                'client_name' => null,
                'status' => 'available',
            ]);

            // Clear client reference if was connected to client
            if ($hasClientConnection) {
                // Find and clear the client
                Client::where('splitter_port_id', $splitterPort->id)->update(['splitter_port_id' => null]);
            }

            $splitterPort->load(['destination', 'destinationClient', 'cable', 'splitter']);

            DB::commit();

            return response()->json([
                'splitter_port' => $splitterPort,
                'message' => 'Koneksi port berhasil diputus',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Make port available (set status to available without clearing destination)
     */
    public function makePortAvailable(Splitter $splitter, SplitterPort $splitterPort)
    {
        // Validate port belongs to this splitter
        if ($splitterPort->splitter_id !== $splitter->id) {
            return response()->json(['error' => 'Port tidak принадлежит splitter ini'], 400);
        }

        $splitterPort->update(['status' => 'available']);

        return response()->json($splitterPort);
    }
}
