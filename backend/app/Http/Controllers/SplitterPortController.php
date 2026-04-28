<?php

namespace App\Http\Controllers;

use App\Models\SplitterPort;
use App\Models\Splitter;
use App\Models\Port;
use App\Models\Cable;
use App\Models\Infrastructure;
use Illuminate\Http\Request;

class SplitterPortController extends Controller
{
    /**
     * Get ports for a specific splitter
     */
    public function index(Request $request, Splitter $splitter)
    {
        $ports = $splitter->ports()
            ->with(['port', 'cable', 'destination'])
            ->orderBy('port_number')
            ->get();

        return response()->json($ports);
    }

    /**
     * Update a splitter port
     */
    public function update(Request $request, SplitterPort $splitterPort)
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:available,reserved,used',
            'port_id' => 'nullable|exists:ports,id',
            'cable_id' => 'nullable|exists:cables,id',
            'core_number' => 'nullable|integer|min:1',
            'destination_infrastructure_id' => 'nullable|exists:infrastructures,id',
            'notes' => 'nullable|string',
        ]);

        // Validate cable core if provided
        if (isset($validated['cable_id']) && isset($validated['core_number'])) {
            $cable = Cable::find($validated['cable_id']);
            if ($validated['core_number'] > $cable->core_count) {
                return response()->json([
                    'error' => 'Core number exceeds cable core count'
                ], 400);
            }
        }

        // Update status based on connections
        if (isset($validated['status'])) {
            // If setting to available, clear all connections
            if ($validated['status'] === 'available') {
                $validated['port_id'] = null;
                $validated['cable_id'] = null;
                $validated['core_number'] = null;
                $validated['destination_infrastructure_id'] = null;
            }
        } elseif (
            isset($validated['cable_id']) ||
            isset($validated['destination_infrastructure_id'])
        ) {
            // Auto-set status to used if has connections
            if ($validated['cable_id'] || $validated['destination_infrastructure_id']) {
                $validated['status'] = 'used';
            }
        }

        $splitterPort->update($validated);
        $splitterPort->load(['port', 'cable', 'destination']);

        return response()->json($splitterPort);
    }

    /**
     * Connect splitter port to ODC port (via pigtail) and cable
     */
    public function connect(Request $request, SplitterPort $splitterPort)
    {
        $validated = $request->validate([
            'port_id' => 'nullable|exists:ports,id',
            'cable_id' => 'nullable|exists:cables,id',
            'core_number' => 'nullable|integer|min:1',
            'destination_infrastructure_id' => 'nullable|exists:infrastructures,id',
            'notes' => 'nullable|string',
            'client_name' => 'nullable|string|max:255',
            'client_area' => 'nullable|string|max:255',
        ]);

        // Validate cable core if cable_id is provided
        if (isset($validated['cable_id']) && isset($validated['core_number'])) {
            $cable = Cable::find($validated['cable_id']);
            if ($validated['core_number'] > $cable->core_count) {
                return response()->json([
                    'error' => 'Core number exceeds cable core count of ' . $cable->core_count
                ], 400);
            }

            // Check if core is already in use
            $existingConnection = SplitterPort::where('cable_id', $validated['cable_id'])
                ->where('core_number', $validated['core_number'])
                ->where('id', '!=', $splitterPort->id)
                ->first();

            if ($existingConnection) {
                return response()->json([
                    'error' => 'Core already in use by another connection'
                ], 400);
            }
        }

        $splitterPort->update([
            'status' => 'used',
            'port_id' => $validated['port_id'] ?? $splitterPort->port_id,
            'cable_id' => $validated['cable_id'] ?? $splitterPort->cable_id,
            'core_number' => $validated['core_number'] ?? $splitterPort->core_number,
            'destination_infrastructure_id' => $validated['destination_infrastructure_id'] ?? $splitterPort->destination_infrastructure_id,
            'notes' => $validated['notes'] ?? $splitterPort->notes,
            'client_name' => $validated['client_name'] ?? $splitterPort->client_name,
            'client_area' => $validated['client_area'] ?? $splitterPort->client_area,
        ]);

        $splitterPort->load(['port', 'cable', 'destination']);

        return response()->json($splitterPort);
    }

    /**
     * Disconnect splitter port (clear all connections)
     */
    public function disconnect(SplitterPort $splitterPort)
    {
        $splitterPort->update([
            'status' => 'available',
            'port_id' => null,
            'cable_id' => null,
            'core_number' => null,
            'destination_infrastructure_id' => null,
            'notes' => null,
            'client_name' => null,
            'client_area' => null,
        ]);

        return response()->json($splitterPort);
    }

    /**
     * Bulk update multiple ports
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'ports' => 'required|array',
            'ports.*.id' => 'required|exists:splitter_ports,id',
            'ports.*.status' => 'sometimes|in:available,reserved,used',
            'ports.*.cable_id' => 'nullable|exists:cables,id',
            'ports.*.core_number' => 'nullable|integer|min:1',
            'ports.*.destination_infrastructure_id' => 'nullable|exists:infrastructures,id',
            'ports.*.notes' => 'nullable|string',
        ]);

        $updatedPorts = [];

        foreach ($validated['ports'] as $portData) {
            $port = SplitterPort::find($portData['id']);

            // Filter allowed fields
            $updateData = array_filter([
                'status' => $portData['status'] ?? null,
                'cable_id' => $portData['cable_id'] ?? null,
                'core_number' => $portData['core_number'] ?? null,
                'destination_infrastructure_id' => $portData['destination_infrastructure_id'] ?? null,
                'notes' => $portData['notes'] ?? null,
            ], fn($v) => $v !== null);

            // Auto-set status to used if has connections
            if (
                isset($updateData['cable_id']) ||
                isset($updateData['destination_infrastructure_id'])
            ) {
                $updateData['status'] = 'used';
            }

            // If setting to available, clear connections
            if (isset($updateData['status']) && $updateData['status'] === 'available') {
                $updateData['cable_id'] = null;
                $updateData['core_number'] = null;
                $updateData['destination_infrastructure_id'] = null;
            }

            $port->update($updateData);
            $port->load(['port', 'cable', 'destination']);
            $updatedPorts[] = $port;
        }

        return response()->json($updatedPorts);
    }

    /**
     * Get port statistics for a splitter
     */
    public function statistics(Splitter $splitter)
    {
        $ports = $splitter->ports;

        return response()->json([
            'total' => $ports->count(),
            'available' => $ports->where('status', 'available')->count(),
            'reserved' => $ports->where('status', 'reserved')->count(),
            'used' => $ports->where('status', 'used')->count(),
        ]);
    }
}
