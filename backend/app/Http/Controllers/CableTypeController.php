<?php

namespace App\Http\Controllers;

use App\Models\CableType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CableTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $cableTypes = CableType::all();
        return response()->json($cableTypes, 200);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:cable_types',
            'type' => 'required|string|max:255',
            'default_core_count' => 'required|integer|min:1',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:20',
            'is_active' => 'boolean',
            'tube_count' => 'nullable|integer|min:1',
            'cores_per_tube' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 422);
        }

        $cableType = CableType::create($request->all());
        return response()->json($cableType, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $cableType = CableType::with('cables')->find($id);

        if (!$cableType) {
            return response()->json(['error' => 'Cable type not found'], 404);
        }

        return response()->json($cableType, 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $cableType = CableType::find($id);

        if (!$cableType) {
            return response()->json(['error' => 'Cable type not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:cable_types,name,'.$id,
            'type' => 'sometimes|required|string|max:255',
            'default_core_count' => 'sometimes|required|integer|min:1',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:20',
            'is_active' => 'boolean',
            'tube_count' => 'nullable|integer|min:1',
            'cores_per_tube' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 422);
        }

        $cableType->update($request->all());
        return response()->json($cableType, 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $cableType = CableType::find($id);

        if (!$cableType) {
            return response()->json(['error' => 'Cable type not found'], 404);
        }

        // Check if cable type is being used by any cables
        if ($cableType->cables()->count() > 0) {
            return response()->json(['error' => 'Cannot delete cable type that is in use'], 400);
        }

        $cableType->delete();
        return response()->json(['message' => 'Cable type deleted successfully'], 200);
    }
}
