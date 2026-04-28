<?php

namespace App\Http\Controllers;

use App\Models\Connection;
use Illuminate\Http\Request;

class ConnectionController extends Controller
{
    /**
     * Display all connections
     */
    public function index()
    {
        $connections = Connection::with('fromInfrastructure', 'toInfrastructure')->get();
        return response()->json($connections);
    }

    /**
     * Store a newly created connection
     */
    public function store(Request $request)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'from_infrastructure_id' => 'required|exists:infrastructures,id|different:to_infrastructure_id',
            'to_infrastructure_id' => 'required|exists:infrastructures,id|different:from_infrastructure_id',
            'type' => 'required|string|max:100',
            'distance' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive,damaged',
            'route_coordinates' => 'nullable|json',
        ]);

        $connection = Connection::create($validated);

        return response()->json($connection, 201);
    }

    /**
     * Display the specified connection
     */
    public function show(Connection $connection)
    {
        return response()->json($connection->load('fromInfrastructure', 'toInfrastructure'));
    }

    /**
     * Update the specified connection
     */
    public function update(Request $request, Connection $connection)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'from_infrastructure_id' => 'sometimes|required|exists:infrastructures,id|different:to_infrastructure_id',
            'to_infrastructure_id' => 'sometimes|required|exists:infrastructures,id|different:from_infrastructure_id',
            'type' => 'sometimes|required|string|max:100',
            'distance' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'sometimes|required|in:active,inactive,damaged',
            'route_coordinates' => 'nullable|json',
        ]);

        $connection->update($validated);

        return response()->json($connection);
    }

    /**
     * Delete the specified connection
     */
    public function destroy(Request $request, Connection $connection)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $connection->delete();

        return response()->json(['message' => 'Connection deleted successfully']);
    }
}
