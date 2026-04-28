<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientConnection;
use App\Models\Infrastructure;
use App\Models\SplitterPort;
use App\Models\Cable;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Get all clients
     */
    public function index(Request $request)
    {
        $query = Client::with(['site', 'connections.infrastructure', 'connections.splitterPort', 'connections.cable']);

        // Filter by site
        if ($request->has('site_id')) {
            $query->where('site_id', $request->site_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search by name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $clients = $query->orderBy('name')->get();

        // Add connection summary
        $clients->each(function ($client) {
            $client->infrastructure_name = $client->connections->first()?->infrastructure?->name;
            $client->infrastructure_type = $client->connections->first()?->infrastructure?->type?->name;
            $client->connection_type = $client->connections->first()?->connection_type;
            $client->is_connected = $client->connections->isNotEmpty();
        });

        return response()->json($clients);
    }

    /**
     * Get client by ID
     */
    public function show(Client $client)
    {
        $client->load(['site', 'connections.infrastructure', 'connections.splitterPort', 'connections.cable', 'connections.splice']);
        return response()->json($client);
    }

    /**
     * Create new client
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'package_type' => 'nullable|string|max:50',
            'monthly_fee' => 'nullable|numeric|min:0',
            'installation_date' => 'nullable|date',
            'status' => 'nullable|in:active,inactive,pending,suspended',
            'site_id' => 'nullable|exists:sites,id',
            'notes' => 'nullable|string',
        ]);

        $client = Client::create($validated);

        return response()->json($client, 201);
    }

    /**
     * Update client
     */
    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'package_type' => 'nullable|string|max:50',
            'monthly_fee' => 'nullable|numeric|min:0',
            'installation_date' => 'nullable|date',
            'status' => 'nullable|in:active,inactive,pending,suspended',
            'site_id' => 'nullable|exists:sites,id',
            'notes' => 'nullable|string',
        ]);

        $client->update($validated);

        return response()->json($client);
    }

    /**
     * Delete client
     */
    public function destroy(Client $client)
    {
        $client->delete();
        return response()->json(null, 204);
    }

    /**
     * Connect client to infrastructure
     */
    public function connect(Request $request, Client $client)
    {
        $validated = $request->validate([
            'infrastructure_id' => 'nullable|exists:infrastructures,id',
            'splitter_port_id' => 'nullable|exists:splitter_ports,id',
            'cable_id' => 'nullable|exists:cables,id',
            'core_number' => 'nullable|integer|min:1',
            'cable_length_m' => 'nullable|numeric|min:0',
            'ont_serial' => 'nullable|string|max:100',
            'ont_model' => 'nullable|string|max:100',
            'ip_address' => 'nullable|ip',
            'connection_type' => 'nullable|in:odp,joint_box,otb,direct',
            'notes' => 'nullable|string',
        ]);

        // Validate infrastructure type matches connection type
        if (isset($validated['infrastructure_id'])) {
            $infrastructure = Infrastructure::find($validated['infrastructure_id']);
            $typeName = strtolower($infrastructure->type?->name ?? '');

            if (isset($validated['connection_type'])) {
                if ($validated['connection_type'] === 'odp' && !str_contains($typeName, 'odp')) {
                    return response()->json(['error' => 'Infrastructure must be ODP for this connection type'], 400);
                }
                if ($validated['connection_type'] === 'joint_box' && !str_contains($typeName, 'joint')) {
                    return response()->json(['error' => 'Infrastructure must be Joint Box for this connection type'], 400);
                }
            }
        }

        // If connecting to splitter port, auto-fill some data
        if (isset($validated['splitter_port_id'])) {
            $splitterPort = SplitterPort::find($validated['splitter_port_id']);
            if ($splitterPort) {
                $splitterPort->update([
                    'client_name' => $client->name,
                    'client_area' => $client->address,
                ]);
            }
        }

        $connection = ClientConnection::create([
            'client_id' => $client->id,
            'infrastructure_id' => $validated['infrastructure_id'] ?? null,
            'splitter_port_id' => $validated['splitter_port_id'] ?? null,
            'cable_id' => $validated['cable_id'] ?? null,
            'core_number' => $validated['core_number'] ?? null,
            'cable_length_m' => $validated['cable_length_m'] ?? null,
            'ont_serial' => $validated['ont_serial'] ?? null,
            'ont_model' => $validated['ont_model'] ?? null,
            'ip_address' => $validated['ip_address'] ?? null,
            'connection_type' => $validated['connection_type'] ?? 'odp',
            'connection_date' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        // Update client status to active
        $client->update(['status' => 'active']);

        $connection->load(['infrastructure', 'splitterPort', 'cable']);

        return response()->json($connection, 201);
    }

    /**
     * Disconnect client from infrastructure
     */
    public function disconnect(Client $client, ClientConnection $connection)
    {
        if ($connection->client_id !== $client->id) {
            return response()->json(['error' => 'Connection not found'], 404);
        }

        // Clear splitter port info if connected
        if ($connection->splitter_port_id) {
            $splitterPort = SplitterPort::find($connection->splitter_port_id);
            if ($splitterPort) {
                $splitterPort->update([
                    'client_name' => null,
                    'client_area' => null,
                    'status' => 'available',
                ]);
            }
        }

        $connection->delete();

        // Check if client has other connections
        if ($client->connections()->count() === 0) {
            $client->update(['status' => 'inactive']);
        }

        return response()->json(['message' => 'Client disconnected successfully']);
    }

    /**
     * Get clients for map display
     */
    public function forMap(Request $request)
    {
        $query = Client::whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->with(['site', 'connections.infrastructure', 'connections.splitterPort']);

        if ($request->has('site_id')) {
            $query->where('site_id', $request->site_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $clients = $query->get();

        // Format for map
        $mapData = $clients->map(function ($client) {
            return [
                'id' => $client->id,
                'name' => $client->name,
                'type' => 'client',
                'category' => 'client',
                'latitude' => $client->latitude,
                'longitude' => $client->longitude,
                'address' => $client->address,
                'phone' => $client->phone,
                'status' => $client->status,
                'package_type' => $client->package_type,
                'infrastructure_name' => $client->connections->first()?->infrastructure?->name,
                'site_name' => $client->site?->name,
            ];
        });

        return response()->json($mapData);
    }

    /**
     * Get statistics
     */
    public function statistics(Request $request)
    {
        $query = Client::query();

        if ($request->has('site_id')) {
            $query->where('site_id', $request->site_id);
        }

        $total = $query->count();
        $active = (clone $query)->where('status', 'active')->count();
        $inactive = (clone $query)->where('status', 'inactive')->count();
        $pending = (clone $query)->where('status', 'pending')->count();
        $suspended = (clone $query)->where('status', 'suspended')->count();

        return response()->json([
            'total' => $total,
            'active' => $active,
            'inactive' => $inactive,
            'pending' => $pending,
            'suspended' => $suspended,
        ]);
    }
}
