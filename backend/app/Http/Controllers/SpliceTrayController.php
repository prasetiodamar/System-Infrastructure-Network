<?php

namespace App\Http\Controllers;

use App\Models\SpliceTray;
use App\Models\Infrastructure;
use Illuminate\Http\Request;

class SpliceTrayController extends Controller
{
    /**
     * Get splice trays for an ODC
     */
    public function index(Infrastructure $infrastructure)
    {
        $trays = SpliceTray::with(['splices.cable', 'splices.pigtail', 'pigtails'])
            ->where('infrastructure_id', $infrastructure->id)
            ->orderBy('name')
            ->get();

        // Add splice count to each tray
        $trays->each(function ($tray) {
            $tray->splice_count = $tray->splices->count();
            $tray->used_capacity = $tray->splices->count();
            $tray->available_capacity = $tray->max_splices - $tray->used_capacity;
        });

        return response()->json($trays);
    }

    /**
     * Store a new splice tray
     */
    public function store(Request $request, Infrastructure $infrastructure)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'max_splices' => 'nullable|integer|min:1|max:144',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $validated['infrastructure_id'] = $infrastructure->id;

        $tray = SpliceTray::create($validated);

        return response()->json($tray, 201);
    }

    /**
     * Update a splice tray
     */
    public function update(Request $request, SpliceTray $spliceTray)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'max_splices' => 'nullable|integer|min:1|max:144',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $spliceTray->update($validated);

        return response()->json($spliceTray);
    }

    /**
     * Delete a splice tray
     */
    public function destroy(SpliceTray $spliceTray)
    {
        // Check if tray has splices
        if ($spliceTray->splices()->count() > 0) {
            return response()->json([
                'error' => 'Cannot delete tray with active splices'
            ], 400);
        }

        $spliceTray->delete();

        return response()->json(null, 204);
    }
}
