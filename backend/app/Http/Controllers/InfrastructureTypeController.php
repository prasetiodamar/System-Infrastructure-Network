<?php

namespace App\Http\Controllers;

use App\Models\InfrastructureType;
use Illuminate\Http\Request;

class InfrastructureTypeController extends Controller
{
    /**
     * Display all infrastructure types
     */
    public function index()
    {
        $types = InfrastructureType::with('children')->whereNull('parent_id')->get();
        return response()->json($types);
    }

    /**
     * Store a newly created type
     */
    public function store(Request $request)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|unique:infrastructure_types,name',
            'icon_url' => 'nullable|string',
            'description' => 'nullable|string',
            'category' => 'nullable|string',
            'default_ports' => 'nullable|integer|min:0|max:256',
            'port_type' => 'nullable|string',
            'default_u_height' => 'nullable|integer|min:0|max:52',
            'default_power_w' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        // Map default_ports to port_count if needed
        if (isset($validated['default_ports']) && !isset($validated['port_count'])) {
            $validated['port_count'] = $validated['default_ports'];
        }

        $type = InfrastructureType::create($validated);

        return response()->json($type, 201);
    }

    /**
     * Display the specified type
     */
    public function show(InfrastructureType $infrastructureType)
    {
        return response()->json($infrastructureType);
    }

    /**
     * Update the specified type
     */
    public function update(Request $request, InfrastructureType $infrastructureType)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|unique:infrastructure_types,name,' . $infrastructureType->id,
            'icon_url' => 'nullable|string',
            'description' => 'nullable|string',
            'category' => 'nullable|string',
            'default_ports' => 'nullable|integer|min:0|max:256',
            'port_type' => 'nullable|string',
            'default_u_height' => 'nullable|integer|min:0|max:52',
            'default_power_w' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        // Map default_ports to port_count if needed
        if (isset($validated['default_ports']) && !isset($validated['port_count'])) {
            $validated['port_count'] = $validated['default_ports'];
        }

        $infrastructureType->update($validated);

        return response()->json($infrastructureType);
    }

    /**
     * Delete the specified type
     */
    public function destroy(Request $request, InfrastructureType $infrastructureType)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $infrastructureType->delete();

        return response()->json(['message' => 'Infrastructure type deleted successfully']);
    }
}
