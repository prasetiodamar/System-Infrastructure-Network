<?php

namespace App\Http\Controllers;

use App\Models\Cable;
use App\Models\Core;
use Illuminate\Http\Request;

class CoreController extends Controller
{
    /**
     * Update a specific core
     */
    public function update(Request $request, Core $core)
    {
        $validated = $request->validate([
            'status' => 'required|in:available,allocated,spliced,damaged,reserved',
            'client_name' => 'nullable|string|max:255',
            'client_area' => 'nullable|string|max:255',
            'allocation_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $core->update($validated);

        return response()->json($core);
    }

    /**
     * Bulk update cores for a cable
     */
    public function bulkUpdate(Request $request, Cable $cable)
    {
        $validated = $request->validate([
            'cores' => 'required|array',
            'cores.*.id' => 'required|exists:cores,id',
            'cores.*.status' => 'required|in:available,allocated,spliced,damaged,reserved',
            'cores.*.client_name' => 'nullable|string|max:255',
            'cores.*.client_area' => 'nullable|string|max:255',
            'cores.*.allocation_date' => 'nullable|date',
            'cores.*.notes' => 'nullable|string',
        ]);

        foreach ($validated['cores'] as $coreData) {
            $core = Core::find($coreData['id']);
            if ($core && $core->cable_id === $cable->id) {
                $core->update($coreData);
            }
        }

        $cores = $cable->cores()->orderBy('core_number')->get();
        return response()->json($cores);
    }
}
