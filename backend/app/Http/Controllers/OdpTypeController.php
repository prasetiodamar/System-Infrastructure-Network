<?php

namespace App\Http\Controllers;

use App\Models\OdpType;
use Illuminate\Http\Request;

class OdpTypeController extends Controller
{
    /**
     * Display a listing of ODP types
     */
    public function index()
    {
        $types = OdpType::orderBy('port_count')->get();
        return response()->json($types);
    }

    /**
     * Store a new ODP type
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'port_count' => 'required|integer|min:1|max:144',
            'description' => 'nullable|string',
        ]);

        $type = OdpType::create($validated);

        return response()->json($type, 201);
    }

    /**
     * Display the specified ODP type
     */
    public function show(OdpType $odpType)
    {
        return response()->json($odpType);
    }

    /**
     * Update the specified ODP type
     */
    public function update(Request $request, OdpType $odpType)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'port_count' => 'sometimes|required|integer|min:1|max:144',
            'description' => 'nullable|string',
        ]);

        $odpType->update($validated);

        return response()->json($odpType);
    }

    /**
     * Remove the specified ODP type
     */
    public function destroy(OdpType $odpType)
    {
        // Check if any infrastructure uses this type
        if ($odpType->infrastructures()->count() > 0) {
            return response()->json([
                'error' => 'Cannot delete ODP type that is in use'
            ], 400);
        }

        $odpType->delete();

        return response()->json(null, 204);
    }
}
