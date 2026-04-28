<?php

namespace App\Http\Controllers;

use App\Models\OdcSplice;
use App\Models\Infrastructure;
use App\Models\SpliceTray;
use App\Models\Pigtail;
use App\Models\Cable;
use App\Models\Port;
use Illuminate\Http\Request;

class OdcSpliceController extends Controller
{
    /**
     * Get all splices for an ODC infrastructure
     */
    public function index(Infrastructure $infrastructure)
    {
        $splices = OdcSplice::with(['spliceTray', 'pigtail', 'cable.fromInfrastructure', 'cable.toInfrastructure'])
            ->where('infrastructure_id', $infrastructure->id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Normalize to match Splice model structure for frontend compatibility
        $normalized = $splices->map(function ($s) {
            return [
                'id' => $s->id,
                'splice_tray_id' => $s->splice_tray_id,
                'cable_id' => $s->cable_id,
                'pigtail_id' => $s->pigtail_id,
                'feeder_core_number' => $s->feeder_core_number,
                'cable_1_core' => $s->feeder_core_number,
                'pigtail_port_number' => $s->pigtail ? $s->pigtail->port_number : null,
                'cable' => $s->cable ? [
                    'id' => $s->cable->id,
                    'name' => $s->cable->name,
                    'from_infrastructure_id' => $s->cable->from_infrastructure_id,
                    'to_infrastructure_id' => $s->cable->to_infrastructure_id,
                    'from_infrastructure' => $s->cable->fromInfrastructure ? [
                        'id' => $s->cable->fromInfrastructure->id,
                        'name' => $s->cable->fromInfrastructure->name,
                    ] : null,
                    'to_infrastructure' => $s->cable->toInfrastructure ? [
                        'id' => $s->cable->toInfrastructure->id,
                        'name' => $s->cable->toInfrastructure->name,
                    ] : null,
                ] : null,
                'pigtail' => $s->pigtail ? [
                    'id' => $s->pigtail->id,
                    'color' => $s->pigtail->color,
                    'port_number' => $s->pigtail->port_number,
                    'status' => $s->pigtail->status,
                ] : null,
                'spliceTray' => $s->spliceTray,
                'splice_type' => $s->splice_type,
                'loss_db' => $s->loss_db,
                'notes' => $s->notes,
                'pigtail_position' => $s->pigtail_position,
                'created_at' => $s->created_at,
                'updated_at' => $s->updated_at,
                'is_odc_splice' => true,
            ];
        });

        return response()->json($normalized);
    }

    /**
     * Get splices for a specific splice tray
     */
    public function getByTray(SpliceTray $spliceTray)
    {
        $splices = OdcSplice::with(['pigtail', 'cable'])
            ->where('splice_tray_id', $spliceTray->id)
            ->orderBy('pigtail_position')
            ->get();

        return response()->json($splices);
    }

    /**
     * Store a new splice (splicing feeder cable to pigtail)
     */
    public function store(Request $request, Infrastructure $infrastructure)
    {
        $validated = $request->validate([
            'splice_tray_id' => 'required|exists:splice_trays,id',
            'pigtail_id' => 'required|exists:pigtails,id',
            'cable_id' => 'nullable|exists:cables,id',
            'feeder_core_number' => 'nullable|integer|min:1',
            'pigtail_position' => 'nullable|integer|min:1',
            'splice_type' => 'nullable|in:fusion,mechanical',
            'loss_db' => 'nullable|numeric|min:0|max:99.99',
            'notes' => 'nullable|string',
        ]);

        // Verify splice tray belongs to this infrastructure
        $spliceTray = SpliceTray::find($validated['splice_tray_id']);
        if ($spliceTray->infrastructure_id !== $infrastructure->id) {
            return response()->json([
                'error' => 'Splice tray does not belong to this ODC'
            ], 400);
        }

        // Verify pigtail belongs to this infrastructure
        $pigtail = Pigtail::find($validated['pigtail_id']);
        if ($pigtail->infrastructure_id !== $infrastructure->id) {
            return response()->json([
                'error' => 'Pigtail does not belong to this ODC'
            ], 400);
        }

        // Check if pigtail is already spliced
        if ($pigtail->status === 'spliced') {
            return response()->json([
                'error' => 'Pigtail is already spliced'
            ], 400);
        }

        // Check splice tray capacity
        $currentSplices = OdcSplice::where('splice_tray_id', $spliceTray->id)->count();
        if ($currentSplices >= $spliceTray->max_splices) {
            return response()->json([
                'error' => 'Splice tray is full'
            ], 400);
        }

        // Check if feeder core is already used
        if (isset($validated['cable_id']) && isset($validated['feeder_core_number'])) {
            $existingSplice = OdcSplice::where('cable_id', $validated['cable_id'])
                ->where('feeder_core_number', $validated['feeder_core_number'])
                ->first();

            if ($existingSplice) {
                return response()->json([
                    'error' => 'Feeder core is already spliced'
                ], 400);
            }
        }

        // Validate cable core count if cable is provided
        if (isset($validated['cable_id']) && isset($validated['feeder_core_number'])) {
            $cable = Cable::find($validated['cable_id']);
            if ($validated['feeder_core_number'] > $cable->core_count) {
                return response()->json([
                    'error' => 'Feeder core number exceeds cable core count'
                ], 400);
            }
        }

        $validated['infrastructure_id'] = $infrastructure->id;

        $splice = OdcSplice::create($validated);

        // Update pigtail status to spliced
        $pigtail->update(['status' => 'spliced']);

        // Load relationships for response
        $splice->load(['spliceTray', 'pigtail', 'cable']);

        return response()->json($splice, 201);
    }

    /**
     * Update a splice
     */
    public function update(Request $request, OdcSplice $odcSplice)
    {
        $validated = $request->validate([
            'splice_tray_id' => 'sometimes|required|exists:splice_trays,id',
            'pigtail_position' => 'nullable|integer|min:1',
            'splice_type' => 'nullable|in:fusion,mechanical',
            'loss_db' => 'nullable|numeric|min:0|max:99.99',
            'notes' => 'nullable|string',
        ]);

        $odcSplice->update($validated);
        $odcSplice->load(['spliceTray', 'pigtail', 'cable']);

        return response()->json($odcSplice);
    }

    /**
     * Delete a splice
     */
    public function destroy(OdcSplice $odcSplice)
    {
        // Update pigtail status back to available
        $pigtail = $odcSplice->pigtail;
        if ($pigtail) {
            $pigtail->update(['status' => 'available']);
        }

        $odcSplice->delete();

        return response()->json(null, 204);
    }
}
