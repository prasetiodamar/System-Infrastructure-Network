<?php

namespace App\Http\Controllers;

use App\Models\Infrastructure;
use App\Models\Port;
use App\Models\Splice;
use Illuminate\Http\Request;

class PortController extends Controller
{
    /**
     * Get all ports for an infrastructure
     */
    public function index(Infrastructure $infrastructure)
    {
        $ports = $infrastructure->ports()
            ->with('connectedPort.infrastructure')
            ->orderBy('port_number')
            ->get();

        return response()->json($ports);
    }

    /**
     * Store a new port for an infrastructure
     */
    public function store(Request $request, Infrastructure $infrastructure)
    {
        $validated = $request->validate([
            'port_number' => 'nullable|integer|min:1',
            'name' => 'nullable|string|max:255',
            'port_type' => 'nullable|in:copper,fiber,sfp,sfp_plus,qsfp,rj45',
            'client_name' => 'nullable|string|max:255',
            'client_area' => 'nullable|string|max:255',
            'status' => 'nullable|in:available,allocated,maintenance',
            'notes' => 'nullable|string',
        ]);

        // If port_number not provided, use next available number
        if (!isset($validated['port_number'])) {
            $maxPort = $infrastructure->ports()->max('port_number') ?? 0;
            $validated['port_number'] = $maxPort + 1;
        }

        $validated['infrastructure_id'] = $infrastructure->id;
        if (!isset($validated['status'])) {
            $validated['status'] = 'available';
        }

        $port = Port::create($validated);

        return response()->json($port, 201);
    }

    /**
     * Update a specific port
     */
    public function update(Request $request, Port $port)
    {
        $validated = $request->validate([
            'port_type' => 'nullable|in:copper,fiber,sfp,sfp_plus,qsfp,rj45',
            'client_name' => 'nullable|string|max:255',
            'client_area' => 'nullable|string|max:255',
            'allocation_date' => 'nullable|date',
            'status' => 'required|in:available,allocated,maintenance',
            'notes' => 'nullable|string',
        ]);

        $port->update($validated);

        // Auto-update all splices that use this port as source
        Splice::where('source_otb_id', $port->infrastructure_id)
            ->where('source_port', $port->port_number)
            ->update([
                'client_name' => $validated['client_name'] ?? '',
                'client_area' => $validated['client_area'] ?? '',
            ]);

        return response()->json($port->load('connectedPort.infrastructure'));
    }

    /**
     * Bulk update ports for an infrastructure
     */
    public function bulkUpdate(Request $request, Infrastructure $infrastructure)
    {
        $validated = $request->validate([
            'ports' => 'required|array',
            'ports.*.id' => 'required|exists:ports,id',
            'ports.*.port_type' => 'nullable|in:copper,fiber,sfp,sfp_plus,qsfp,rj45',
            'ports.*.client_name' => 'nullable|string|max:255',
            'ports.*.client_area' => 'nullable|string|max:255',
            'ports.*.allocation_date' => 'nullable|date',
            'ports.*.status' => 'required|in:available,allocated,maintenance',
            'ports.*.notes' => 'nullable|string',
        ]);

        foreach ($validated['ports'] as $portData) {
            $port = Port::find($portData['id']);
            if ($port && $port->infrastructure_id === $infrastructure->id) {
                $port->update($portData);

                // Auto-update all splices that use this port as source
                if (isset($portData['client_name']) || isset($portData['client_area'])) {
                    Splice::where('source_otb_id', $port->infrastructure_id)
                        ->where('source_port', $port->port_number)
                        ->update([
                            'client_name' => $portData['client_name'] ?? '',
                            'client_area' => $portData['client_area'] ?? '',
                        ]);
                }
            }
        }

        $ports = $infrastructure->ports()
            ->with('connectedPort.infrastructure')
            ->orderBy('port_number')
            ->get();

        return response()->json($ports);
    }

    /**
     * Get port allocation summary for an infrastructure
     */
    public function summary(Infrastructure $infrastructure)
    {
        $totalPorts = $infrastructure->ports()->count();
        $allocatedPorts = $infrastructure->ports()->where('status', 'allocated')->count();
        $availablePorts = $infrastructure->ports()->where('status', 'available')->count();
        $maintenancePorts = $infrastructure->ports()->where('status', 'maintenance')->count();

        return response()->json([
            'total' => $totalPorts,
            'allocated' => $allocatedPorts,
            'available' => $availablePorts,
            'maintenance' => $maintenancePorts,
        ]);
    }

    /**
     * Connect port to another port
     */
    public function connectPort(Request $request, Port $port)
    {
        $validated = $request->validate([
            'connected_port_id' => 'required|exists:ports,id|different:' . $port->id,
            'connection_type' => 'required|in:fiber,copper,wireless',
            'cable_length_m' => 'nullable|numeric|min:0',
            'cable_label' => 'nullable|string|max:255',
        ]);

        // Disconnect existing connection if any
        if ($port->connected_port_id) {
            $oldConnectedPort = Port::find($port->connected_port_id);
            if ($oldConnectedPort) {
                $oldConnectedPort->update(['connected_port_id' => null]);
            }
        }

        // Update port connection
        $port->update([
            'connected_port_id' => $validated['connected_port_id'],
            'connection_type' => $validated['connection_type'],
            'cable_length_m' => $validated['cable_length_m'],
            'cable_label' => $validated['cable_label'],
        ]);

        // Update reverse connection
        $connectedPort = Port::find($validated['connected_port_id']);
        if ($connectedPort) {
            // Disconnect old reverse connection if any
            if ($connectedPort->connected_port_id) {
                $oldReversePort = Port::find($connectedPort->connected_port_id);
                if ($oldReversePort && $oldReversePort->id !== $port->id) {
                    $oldReversePort->update(['connected_port_id' => null]);
                }
            }

            $connectedPort->update([
                'connected_port_id' => $port->id,
                'connection_type' => $validated['connection_type'],
                'cable_length_m' => $validated['cable_length_m'],
                'cable_label' => $validated['cable_label'],
            ]);
        }

        return response()->json($port->load('connectedPort.infrastructure'));
    }

    /**
     * Disconnect port from connected port
     */
    public function disconnectPort(Port $port)
    {
        if (!$port->connected_port_id) {
            return response()->json(['message' => 'Port is not connected'], 400);
        }

        $connectedPortId = $port->connected_port_id;

        // Disconnect this port
        $port->update([
            'connected_port_id' => null,
            'connection_type' => null,
            'cable_length_m' => null,
            'cable_label' => null,
        ]);

        // Disconnect reverse connection
        $connectedPort = Port::find($connectedPortId);
        if ($connectedPort) {
            $connectedPort->update([
                'connected_port_id' => null,
                'connection_type' => null,
                'cable_length_m' => null,
                'cable_label' => null,
            ]);
        }

        return response()->json(['message' => 'Port disconnected successfully']);
    }

    /**
     * Delete a port
     */
    public function destroy(Port $port)
    {
        // Disconnect if connected
        if ($port->connected_port_id) {
            $connectedPort = Port::find($port->connected_port_id);
            if ($connectedPort) {
                $connectedPort->update(['connected_port_id' => null]);
            }
        }

        $port->delete();

        return response()->json(null, 204);
    }
}
