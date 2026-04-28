<?php

namespace App\Http\Controllers;

use App\Models\OdcType;
use Illuminate\Http\Request;

class OdcTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = OdcType::query();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $types = $query->orderBy('port_count')->get();

        return response()->json($types);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'port_count' => 'required|integer|min:1|max:256',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $type = OdcType::create($validated);

        return response()->json($type, 201);
    }

    public function show(OdcType $odcType)
    {
        return response()->json($odcType);
    }

    public function update(Request $request, OdcType $odcType)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'port_count' => 'sometimes|required|integer|min:1|max:256',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $odcType->update($validated);

        return response()->json($odcType);
    }

    public function destroy(OdcType $odcType)
    {
        // Check if any infrastructure uses this type
        if ($odcType->infrastructures()->count() > 0) {
            return response()->json([
                'error' => 'Cannot delete ODC type that is in use by infrastructure'
            ], 400);
        }

        $odcType->delete();

        return response()->json(null, 204);
    }
}
