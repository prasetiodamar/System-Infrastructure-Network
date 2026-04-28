<?php

namespace App\Http\Controllers;

use App\Models\Pigtail;
use App\Models\Infrastructure;
use App\Models\Splitter;
use Illuminate\Http\Request;

class PigtailController extends Controller
{
    /**
     * Get pigtails for an ODC
     */
    public function index(Infrastructure $infrastructure)
    {
        $pigtails = Pigtail::with(['spliceTray', 'splitter'])
            ->where('infrastructure_id', $infrastructure->id)
            ->orderBy('port_number')
            ->get();

        return response()->json($pigtails);
    }

    /**
     * Store a new pigtail
     */
    public function store(Request $request, Infrastructure $infrastructure)
    {
        $validated = $request->validate([
            'splice_tray_id' => 'nullable|exists:splice_trays,id',
            'port_number' => 'nullable|integer|min:1',
            'color' => 'required|string|max:50',
            'fiber_type' => 'nullable|string|in:SMF,MMF',
            'length_m' => 'nullable|numeric|min:0.1|max:100',
            'notes' => 'nullable|string',
        ]);

        $validated['infrastructure_id'] = $infrastructure->id;

        // Check if port is already used
        if (isset($validated['port_number'])) {
            $existing = Pigtail::where('infrastructure_id', $infrastructure->id)
                ->where('port_number', $validated['port_number'])
                ->first();

            if ($existing) {
                return response()->json([
                    'error' => 'Port number already in use'
                ], 400);
            }
        }

        $pigtail = Pigtail::create($validated);

        return response()->json($pigtail, 201);
    }

    /**
     * Update a pigtail
     */
    public function update(Request $request, Pigtail $pigtail)
    {
        $validated = $request->validate([
            'splice_tray_id' => 'nullable|exists:splice_trays,id',
            'port_number' => 'nullable|integer|min:1',
            'color' => 'sometimes|required|string|max:50',
            'fiber_type' => 'nullable|string|in:SMF,MMF',
            'length_m' => 'nullable|numeric|min:0.1|max:100',
            'status' => 'nullable|in:available,spliced,damaged',
            'notes' => 'nullable|string',
        ]);

        // Check if port is already used by another pigtail
        if (isset($validated['port_number']) && $validated['port_number'] !== $pigtail->port_number) {
            $existing = Pigtail::where('infrastructure_id', $pigtail->infrastructure_id)
                ->where('port_number', $validated['port_number'])
                ->where('id', '!=', $pigtail->id)
                ->first();

            if ($existing) {
                return response()->json([
                    'error' => 'Port number already in use'
                ], 400);
            }
        }

        $pigtail->update($validated);

        return response()->json($pigtail);
    }

    /**
     * Connect pigtail to splitter (as splitter input)
     */
    public function connectToSplitter(Request $request, Pigtail $pigtail)
    {
        $validated = $request->validate([
            'splitter_id' => 'required|exists:splitters,id',
        ]);

        // Verify splitter belongs to same infrastructure
        $splitter = Splitter::find($validated['splitter_id']);
        if ($splitter->infrastructure_id !== $pigtail->infrastructure_id) {
            return response()->json([
                'error' => 'Splitter harus berada di ODC yang sama'
            ], 400);
        }

        // Check if pigtail is already connected to another splitter
        if ($pigtail->connected_splitter_id) {
            return response()->json([
                'error' => 'Pigtail ini sudah terhubung ke splitter lain'
            ], 400);
        }

        // Check if splitter already has an input pigtail
        if ($splitter->input_pigtail_id) {
            return response()->json([
                'error' => 'Splitter ini sudah memiliki input dari pigtail lain'
            ], 400);
        }

        // Update splitter input first (remove old reference if any)
        if ($splitter->input_pigtail_id) {
            $oldPigtail = Pigtail::find($splitter->input_pigtail_id);
            if ($oldPigtail) {
                $oldPigtail->update(['connected_splitter_id' => null, 'status' => 'available']);
            }
        }

        // Update splitter input
        $splitter->input_pigtail_id = $pigtail->id;
        $splitter->save();

        // Update pigtail
        $pigtail->connected_splitter_id = $splitter->id;
        $pigtail->status = 'connected';
        $pigtail->save();

        return response()->json($pigtail->load('splitter'));
    }

    /**
     * Disconnect pigtail from splitter
     */
    public function disconnectFromSplitter(Pigtail $pigtail)
    {
        if ($pigtail->connected_splitter_id) {
            $splitter = Splitter::find($pigtail->connected_splitter_id);
            if ($splitter && $splitter->input_pigtail_id === $pigtail->id) {
                $splitter->input_pigtail_id = null;
                $splitter->save();
            }
        }

        $pigtail->connected_splitter_id = null;
        $pigtail->status = 'available';
        $pigtail->save();

        return response()->json($pigtail);
    }

    /**
     * Delete a pigtail
     */
    public function destroy(Pigtail $pigtail)
    {
        $pigtail->delete();

        return response()->json(null, 204);
    }

    /**
     * Get available colors
     */
    public function getColors()
    {
        $colors = [
            ['value' => 'Blue', 'label' => 'Blue', 'hex' => '#0077BE'],
            ['value' => 'Orange', 'label' => 'Orange', 'hex' => '#FFA500'],
            ['value' => 'Green', 'label' => 'Green', 'hex' => '#008A00'],
            ['value' => 'Brown', 'label' => 'Brown', 'hex' => '#8B4513'],
            ['value' => 'Slate', 'label' => 'Slate', 'hex' => '#708090'],
            ['value' => 'White', 'label' => 'White', 'hex' => '#FFFFFF'],
            ['value' => 'Red', 'label' => 'Red', 'hex' => '#FF0000'],
            ['value' => 'Black', 'label' => 'Black', 'hex' => '#000000'],
            ['value' => 'Yellow', 'label' => 'Yellow', 'hex' => '#FFFF00'],
            ['value' => 'Violet', 'label' => 'Violet', 'hex' => '#EE82EE'],
            ['value' => 'Rose', 'label' => 'Rose', 'hex' => '#FF007F'],
            ['value' => 'Aqua', 'label' => 'Aqua', 'hex' => '#00FFFF'],
        ];

        return response()->json($colors);
    }
}
