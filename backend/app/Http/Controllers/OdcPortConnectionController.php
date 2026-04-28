<?php

namespace App\Http\Controllers;

use App\Models\OdcPortConnection;
use App\Models\Infrastructure;
use App\Models\Port;
use App\Models\Splitter;
use App\Models\SplitterPort;
use App\Models\Cable;
use App\Models\Pigtail;
use App\Models\OdcSplice;
use App\Models\SpliceTray;
use App\Models\Cable as CableModel;
use App\Models\Core;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OdcPortConnectionController extends Controller
{
    /**
     * Get all port connections for an ODC
     */
    public function index(Infrastructure $infrastructure)
    {
        $connections = OdcPortConnection::with(['port', 'pigtail', 'splitter', 'splitterPort'])
            ->where('infrastructure_id', $infrastructure->id)
            ->orderBy('port_id')
            ->orderBy('position')
            ->get();

        // Enrich pigtail connections with splice details
        foreach ($connections as $conn) {
            if ($conn->connection_type === 'pigtail' && $conn->pigtail_id) {
                // Get splice info for this pigtail
                $splice = OdcSplice::where('pigtail_id', $conn->pigtail_id)->first();
                if ($splice) {
                    $conn->splice_info = [
                        'id' => $splice->id,
                        'tray_name' => $splice->spliceTray ? $splice->spliceTray->name : 'Tray ' . $splice->spliceTray?->tray_number,
                        'cable_name' => $splice->cable ? $splice->cable->name : null,
                        'core_number' => $splice->feeder_core_number,
                    ];
                }
                // Get tray info
                $pigtail = $conn->pigtail;
                if ($pigtail && $pigtail->splice_tray_id) {
                    $tray = SpliceTray::find($pigtail->splice_tray_id);
                    $conn->pigtail->tray_name = $tray ? ($tray->name ?: 'Tray ' . $tray->tray_number) : null;
                }
            }

            // Enrich splitter_output with destination info
            if ($conn->connection_type === 'splitter_output' && $conn->splitter_port_id) {
                $splitterPort = $conn->splitterPort;
                if ($splitterPort) {
                    $conn->output_info = [
                        'port_number' => $splitterPort->port_number,
                        'destination_name' => $splitterPort->destination ? $splitterPort->destination->name : null,
                        'cable_name' => $splitterPort->cable ? $splitterPort->cable->name : null,
                    ];
                }
            }
        }

        // Group connections by port
        $portsWithConnections = [];
        foreach ($connections as $conn) {
            $portId = $conn->port_id;
            if (!isset($portsWithConnections[$portId])) {
                $portsWithConnections[$portId] = [
                    'port' => $conn->port,
                    'connections' => []
                ];
            }
            $portsWithConnections[$portId]['connections'][] = $conn;
        }

        // Get ports that don't have connections yet
        $allPorts = Port::where('infrastructure_id', $infrastructure->id)
            ->orderBy('port_number')
            ->get();

        $availablePorts = $allPorts->filter(function ($port) use ($connections) {
            $connCount = $connections->where('port_id', $port->id)->count();
            return $connCount < 2;
        });

        return response()->json([
            'connections' => $connections,
            'ports_with_connections' => array_values($portsWithConnections),
            'all_ports' => $allPorts,
            'available_ports' => $availablePorts->values(),
        ]);
    }

    /**
     * Connect splitter input to ODC port
     */
    public function connectSplitterInput(Request $request, Infrastructure $infrastructure)
    {
        $validated = $request->validate([
            'port_id' => 'required|exists:ports,id',
            'splitter_id' => 'required|exists:splitters,id',
        ]);

        // Verify splitter belongs to this ODC
        $splitter = Splitter::find($validated['splitter_id']);
        if ($splitter->infrastructure_id !== $infrastructure->id) {
            return response()->json(['error' => 'Splitter tidak принадлежит ODC ini'], 400);
        }

        // Verify port belongs to this ODC
        $port = Port::find($validated['port_id']);
        if ($port->infrastructure_id !== $infrastructure->id) {
            return response()->json(['error' => 'Port tidak принадлежит ODC ini'], 400);
        }

        // Check if splitter is already connected
        $existingConnection = OdcPortConnection::where('splitter_id', $validated['splitter_id'])
            ->where('connection_type', 'splitter_input')
            ->first();

        if ($existingConnection) {
            return response()->json([
                'error' => 'Splitter INPUT sudah terhubung ke port lain',
                'existing_connection' => $existingConnection,
                'warning' => true,
            ], 409);
        }

        // Check if port has available position
        $position = OdcPortConnection::getNextPosition($validated['port_id']);
        if ($position === null) {
            return response()->json(['error' => 'Port sudah penuh (max 2 koneksi)'], 400);
        }

        $connection = OdcPortConnection::create([
            'infrastructure_id' => $infrastructure->id,
            'port_id' => $validated['port_id'],
            'connection_type' => 'splitter_input',
            'splitter_id' => $validated['splitter_id'],
            'position' => $position,
            'notes' => $validated['notes'] ?? null,
        ]);

        $connection->load(['port', 'splitter']);

        return response()->json($connection, 201);
    }

    /**
     * Connect splitter output to ODC port and create cable to ODP
     */
    public function connectSplitterOutput(Request $request, Infrastructure $infrastructure)
    {
        $validated = $request->validate([
            'port_id' => 'required|exists:ports,id',
            'splitter_port_id' => 'required|exists:splitter_ports,id',
            'odp_id' => 'required_without:create_odp|exists:infrastructures,id',
            'create_odp' => 'required_without:odp_id|array',
            'create_odp.name' => 'required_with:create_odp|string|max:255',
            'create_odp.latitude' => 'nullable|numeric|between:-90,90',
            'create_odp.longitude' => 'nullable|numeric|between:-180,180',
            'create_odp.address' => 'nullable|string',
        ]);

        // Get splitter port and verify
        $splitterPort = SplitterPort::with('splitter')->find($validated['splitter_port_id']);
        $splitter = $splitterPort->splitter;

        if ($splitter->infrastructure_id !== $infrastructure->id) {
            return response()->json(['error' => 'Splitter port tidak принадлежит ODC ini'], 400);
        }

        // Check if splitter port is already connected
        $existingConnection = OdcPortConnection::where('splitter_port_id', $validated['splitter_port_id'])
            ->where('connection_type', 'splitter_output')
            ->first();

        if ($existingConnection) {
            return response()->json([
                'error' => 'Port splitter sudah terhubung ke port ODC lain',
                'existing_connection' => $existingConnection,
                'warning' => true,
            ], 409);
        }

        // Check if ODP is already connected (conflict)
        if (isset($validated['odp_id'])) {
            $conflictingOdp = OdcPortConnection::where('connection_type', 'splitter_output')
                ->whereHas('splitterPort', function ($q) use ($validated) {
                    $q->where('destination_infrastructure_id', $validated['odp_id']);
                })
                ->first();

            if ($conflictingOdp) {
                return response()->json([
                    'error' => 'ODP sudah dialokasikan ke port lain',
                    'conflicting_connection' => $conflictingOdp,
                    'warning' => true,
                ], 409);
            }
        }

        // Verify port belongs to this ODC
        $port = Port::find($validated['port_id']);
        if ($port->infrastructure_id !== $infrastructure->id) {
            return response()->json(['error' => 'Port tidak принадлежит ODC ini'], 400);
        }

        // Check if port has available position
        $position = OdcPortConnection::getNextPosition($validated['port_id']);
        if ($position === null) {
            return response()->json(['error' => 'Port sudah penuh (max 2 koneksi)'], 400);
        }

        DB::beginTransaction();
        try {
            $odpId = null;
            $odpName = null;

            // Handle ODP creation or use existing
            if (isset($validated['create_odp'])) {
                $odpType = \App\Models\InfrastructureType::where('category', 'odp')->first();
                if (!$odpType) {
                    return response()->json(['error' => 'Tipe ODP tidak ditemukan'], 400);
                }

                $newOdp = Infrastructure::create([
                    'name' => $validated['create_odp']['name'],
                    'type_id' => $odpType->id,
                    'latitude' => $validated['create_odp']['latitude'] ?? null,
                    'longitude' => $validated['create_odp']['longitude'] ?? null,
                    'address' => $validated['create_odp']['address'] ?? null,
                    'status' => 'active',
                ]);

                $odpId = $newOdp->id;
                $odpName = $newOdp->name;
            } else {
                $odpId = $validated['odp_id'];
                $odp = Infrastructure::find($odpId);
                $odpName = $odp->name;
            }

            // Generate cable name: {ODC-name}-P{port-number}
            $odcName = $infrastructure->name ?? 'ODC';
            $cableName = $odcName . '-P' . $port->port_number;

            // Get default cable type (or first available)
            $cableTypeId = \App\Models\CableType::first()->id ?? null;

            // Create cable
            $cable = Cable::create([
                'name' => $cableName,
                'from_infrastructure_id' => $infrastructure->id,
                'to_infrastructure_id' => $odpId,
                'cable_type_id' => $cableTypeId,
                'status' => 'active',
                'notes' => 'Auto-generated cable from ODC port connection',
            ]);

            // Update splitter port with destination
            $splitterPort->update([
                'destination_infrastructure_id' => $odpId,
                'cable_id' => $cable->id,
                'status' => 'used',
            ]);

            // Create port connection
            $connection = OdcPortConnection::create([
                'infrastructure_id' => $infrastructure->id,
                'port_id' => $validated['port_id'],
                'connection_type' => 'splitter_output',
                'splitter_id' => $splitter->id,
                'splitter_port_id' => $validated['splitter_port_id'],
                'position' => $position,
            ]);

            $connection->load(['port', 'splitter', 'splitterPort']);

            DB::commit();

            return response()->json([
                'connection' => $connection,
                'cable' => $cable,
                'odp_name' => $odpName,
                'message' => "Port berhasil terhubung ke {$odpName}. Kabel {$cableName} sudah dibuat.",
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Connect pigtail to ODC port
     */
    public function connectPigtail(Request $request, Infrastructure $infrastructure)
    {
        $validated = $request->validate([
            'port_id' => 'required|exists:ports,id',
            'pigtail_id' => 'required|exists:pigtails,id',
        ]);

        // Verify pigtail belongs to this ODC
        $pigtail = \App\Models\Pigtail::find($validated['pigtail_id']);
        if ($pigtail->infrastructure_id !== $infrastructure->id) {
            return response()->json(['error' => 'Pigtail tidak принадлежит ODC ini'], 400);
        }

        // Verify port belongs to this ODC
        $port = Port::find($validated['port_id']);
        if ($port->infrastructure_id !== $infrastructure->id) {
            return response()->json(['error' => 'Port tidak принадлежит ODC ini'], 400);
        }

        // Check if pigtail is already connected
        $existingConnection = OdcPortConnection::where('pigtail_id', $validated['pigtail_id'])
            ->where('connection_type', 'pigtail')
            ->first();

        if ($existingConnection) {
            return response()->json([
                'error' => 'Pigtail sudah terhubung ke port lain',
                'existing_connection' => $existingConnection,
                'warning' => true,
            ], 409);
        }

        // Check if port has available position
        $position = OdcPortConnection::getNextPosition($validated['port_id']);
        if ($position === null) {
            return response()->json(['error' => 'Port sudah penuh (max 2 koneksi)'], 400);
        }

        $connection = OdcPortConnection::create([
            'infrastructure_id' => $infrastructure->id,
            'port_id' => $validated['port_id'],
            'connection_type' => 'pigtail',
            'pigtail_id' => $validated['pigtail_id'],
            'position' => $position,
            'notes' => $validated['notes'] ?? null,
        ]);

        $connection->load(['port', 'pigtail']);

        return response()->json($connection, 201);
    }

    /**
     * Disconnect a port connection
     */
    public function disconnect(OdcPortConnection $odcPortConnection)
    {
        // If splitter output, also update splitter port and potentially delete cable
        if ($odcPortConnection->connection_type === 'splitter_output' && $odcPortConnection->splitter_port_id) {
            $splitterPort = SplitterPort::find($odcPortConnection->splitter_port_id);
            if ($splitterPort) {
                // Delete associated cable
                if ($splitterPort->cable_id) {
                    Cable::find($splitterPort->cable_id)?->delete();
                }

                // Reset splitter port
                $splitterPort->update([
                    'destination_infrastructure_id' => null,
                    'cable_id' => null,
                    'status' => 'available',
                ]);
            }
        }

        $odcPortConnection->delete();

        return response()->json(['message' => 'Koneksi berhasil diputus']);
    }

    /**
     * Update a port connection (notes, destination ODP)
     */
    public function update(Request $request, OdcPortConnection $odcPortConnection)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
            'new_odp_id' => 'nullable|exists:infrastructures,id',
        ]);

        // Update notes
        if (array_key_exists('notes', $validated)) {
            $odcPortConnection->update(['notes' => $validated['notes']]);
        }

        // Change destination ODP for splitter_output
        if ($odcPortConnection->connection_type === 'splitter_output' && isset($validated['new_odp_id'])) {
            $splitterPort = SplitterPort::find($odcPortConnection->splitter_port_id);
            if ($splitterPort) {
                // Check if new ODP is already connected elsewhere
                $conflicting = OdcPortConnection::where('connection_type', 'splitter_output')
                    ->where('id', '!=', $odcPortConnection->id)
                    ->whereHas('splitterPort', function ($q) use ($validated) {
                        $q->where('destination_infrastructure_id', $validated['new_odp_id']);
                    })
                    ->first();

                if ($conflicting) {
                    return response()->json([
                        'error' => 'ODP sudah dialokasikan ke port lain',
                        'warning' => true,
                    ], 409);
                }

                // Delete old cable
                if ($splitterPort->cable_id) {
                    Cable::find($splitterPort->cable_id)?->delete();
                }

                // Create new cable to new ODP
                $newOdp = Infrastructure::find($validated['new_odp_id']);
                $odc = Infrastructure::find($odcPortConnection->infrastructure_id);
                $port = Port::find($odcPortConnection->port_id);

                $cableName = ($odc->name ?? 'ODC') . '-P' . ($port->port_number ?? '?');
                $cableTypeId = \App\Models\CableType::first()->id ?? null;

                $cable = Cable::create([
                    'name' => $cableName,
                    'from_infrastructure_id' => $odcPortConnection->infrastructure_id,
                    'to_infrastructure_id' => $validated['new_odp_id'],
                    'cable_type_id' => $cableTypeId,
                    'status' => 'active',
                    'notes' => 'Auto-generated cable from ODC port connection',
                ]);

                // Update splitter port with new destination
                $splitterPort->update([
                    'destination_infrastructure_id' => $validated['new_odp_id'],
                    'cable_id' => $cable->id,
                ]);
            }
        }

        $odcPortConnection->load(['port', 'splitter', 'splitterPort', 'pigtail']);

        return response()->json([
            'connection' => $odcPortConnection,
            'message' => 'Koneksi berhasil diperbarui',
        ]);
    }

    /**
     * Get available splitters for connection
     */
    public function getAvailableSplitters(Infrastructure $infrastructure)
    {
        // Get splitters that don't have input connected
        $connectedSplitterIds = OdcPortConnection::where('infrastructure_id', $infrastructure->id)
            ->where('connection_type', 'splitter_input')
            ->pluck('splitter_id')
            ->toArray();

        $splitters = Splitter::where('infrastructure_id', $infrastructure->id)
            ->whereNotIn('id', $connectedSplitterIds)
            ->with('ports')
            ->get();

        return response()->json($splitters);
    }

    /**
     * Get available splitter ports for connection
     */
    public function getAvailableSplitterPorts(Infrastructure $infrastructure)
    {
        // Get splitter ports that are used
        $usedPortIds = OdcPortConnection::where('infrastructure_id', $infrastructure->id)
            ->where('connection_type', 'splitter_output')
            ->pluck('splitter_port_id')
            ->toArray();

        $splitterPorts = SplitterPort::whereHas('splitter', function ($q) use ($infrastructure) {
            $q->where('infrastructure_id', $infrastructure->id);
        })
            ->whereNotIn('id', $usedPortIds)
            ->where('status', 'available')
            ->with(['splitter', 'destination'])
            ->get();

        return response()->json($splitterPorts);
    }

    /**
     * Get available ODPs for connection (only unconnected)
     */
    public function getAvailableOdps()
    {
        // Get ODPs that are already connected
        $connectedOdpIds = OdcPortConnection::where('connection_type', 'splitter_output')
            ->whereHas('splitterPort', function ($q) {
                $q->whereNotNull('destination_infrastructure_id');
            })
            ->get()
            ->map(function ($conn) {
                return $conn->splitterPort->destination_infrastructure_id;
            })
            ->filter()
            ->unique()
            ->toArray();

        $odps = Infrastructure::whereHas('type', function ($q) {
            $q->where('category', 'odp');
        })
            ->whereNotIn('id', $connectedOdpIds)
            ->orderBy('name')
            ->get(['id', 'name', 'address']);

        return response()->json($odps);
    }

    /**
     * Get ODPs connected via cable to this ODC
     */
    public function getConnectedOdps(Infrastructure $infrastructure)
    {
        // Get ODPs that have a cable connected to this ODC
        $connectedOdpIds = Cable::where('from_infrastructure_id', $infrastructure->id)
            ->orWhere('to_infrastructure_id', $infrastructure->id)
            ->pluck('from_infrastructure_id')
            ->merge(
                Cable::where('from_infrastructure_id', $infrastructure->id)
                    ->orWhere('to_infrastructure_id', $infrastructure->id)
                    ->pluck('to_infrastructure_id')
            )
            ->unique()
            ->filter()
            ->toArray();

        // Remove current infrastructure from list
        $connectedOdpIds = array_filter($connectedOdpIds, fn($id) => $id != $infrastructure->id);

        $odps = Infrastructure::whereHas('type', function ($q) {
            $q->where('category', 'odp');
        })
            ->whereIn('id', $connectedOdpIds)
            ->orderBy('name')
            ->get(['id', 'name', 'address', 'latitude', 'longitude']);

        return response()->json($odps);
    }
}
