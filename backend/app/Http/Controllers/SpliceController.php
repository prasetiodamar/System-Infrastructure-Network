<?php

namespace App\Http\Controllers;

use App\Models\Infrastructure;
use App\Models\Splice;
use App\Models\Core;
use App\Models\Cable;
use App\Models\Port;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SpliceController extends Controller
{
    /**
     * Get all splices (for search functionality)
     */
    public function getAll()
    {
        $splices = Splice::all();
        return response()->json($splices);
    }

    /**
     * Get all splices for a joint box (or any infrastructure like OTB)
     */
    public function index(Infrastructure $infrastructure)
    {
        // Check if this infrastructure is OTB type
        $isOtb = $infrastructure->type && strtolower($infrastructure->type->name) && (
            str_contains(strtolower($infrastructure->type->name), 'otb') ||
            str_contains(strtolower($infrastructure->type->name), 'odp') ||
            str_contains(strtolower($infrastructure->type->name), 'odc')
        );

        $splices;
        if ($isOtb) {
            // For OTB: show only pigtail splices (splice_type = 'otb') where this OTB is the source
            // Don't show closure splices that were created at Joint Boxes even if they have source_otb_id
            $splices = Splice::where('source_otb_id', $infrastructure->id)
                ->where('splice_type', 'otb');
        } else {
            // For Joint Box: show splices where this joint box is the infrastructure
            $splices = Splice::where('joint_box_infrastructure_id', $infrastructure->id);
        }

        $splices = $splices
            ->with(['cable1', 'cable2', 'cable1.fromInfrastructure', 'cable1.toInfrastructure', 'cable2.fromInfrastructure', 'cable2.toInfrastructure'])
            ->get()
            ->map(function ($splice) {
                // Add core color information
                $splice->core1_info = $splice->core1 ? [
                    'core_number' => $splice->core1->core_number,
                    'tube_number' => $splice->core1->tube_number,
                    'tube_color' => $splice->core1->tube_color,
                    'fiber_color' => $splice->core1->fiber_color,
                    'status' => $splice->core1->status,
                ] : null;

                $splice->core2_info = $splice->core2 ? [
                    'core_number' => $splice->core2->core_number,
                    'tube_number' => $splice->core2->tube_number,
                    'tube_color' => $splice->core2->tube_color,
                    'fiber_color' => $splice->core2->fiber_color,
                    'status' => $splice->core2->status,
                ] : null;

                return $splice;
            });

        return response()->json($splices);
    }

    /**
     * Store a new splice
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'joint_box_infrastructure_id' => 'required|exists:infrastructures,id',
            'cable_1_id' => 'nullable', // Optional for OTB pigtail
            'cable_1_core' => 'required|integer',
            'cable_2_id' => 'required|exists:cables,id',
            'cable_2_core' => 'required|integer',
            'splice_type' => 'required|in:otb,closure,tray,termination,odp,odc,rozet',
            'splice_date' => 'nullable|date',
            'notes' => 'nullable|string',
            // Client tracking fields
            'client_name' => 'nullable|string',
            'client_area' => 'nullable|string',
            'source_otb_id' => 'nullable|integer',
            'source_otb_name' => 'nullable|string',
            'source_port' => 'nullable|integer',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
        ]);

        DB::beginTransaction();
        try {
            // For OTB pigtail: convert 'pigtail' to null and get client info from Port
            if ($validated['cable_1_id'] === 'pigtail') {
                $validated['cable_1_id'] = null;

                // Get client info from Port at OTB
                $port = Port::where('infrastructure_id', $validated['joint_box_infrastructure_id'])
                    ->where('port_number', $validated['cable_1_core'])
                    ->first();

                if ($port) {
                    $portStatus = $port->status ?? 'available';

                    // If port is allocated, use client info from port
                    if ($portStatus === 'allocated') {
                        if (empty($validated['client_name'])) {
                            $validated['client_name'] = $port->client_name ?? 'Unknown';
                        }
                        if (empty($validated['client_area'])) {
                            $validated['client_area'] = $port->client_area ?? '';
                        }
                    } else {
                        // If port is available or maintenance, set client_name accordingly
                        if (empty($validated['client_name'])) {
                            $validated['client_name'] = $portStatus;
                        }
                    }
                }

                // Set source OTB info
                $validated['source_otb_id'] = $validated['joint_box_infrastructure_id'];
                $infra = Infrastructure::find($validated['joint_box_infrastructure_id']);
                $validated['source_otb_name'] = $infra ? $infra->name : null;
                $validated['source_port'] = $validated['cable_1_core'];
            }

            // Auto-fill client_name from cable_1 core if not provided
            if ($validated['cable_1_id']) {
                $core1 = Core::where('cable_id', $validated['cable_1_id'])
                    ->where('core_number', $validated['cable_1_core'])
                    ->first();

                if ($core1) {
                    if (empty($validated['client_name']) && $core1->client_name) {
                        $validated['client_name'] = $core1->client_name;
                    }
                    if (empty($validated['client_area']) && $core1->client_area) {
                        $validated['client_area'] = $core1->client_area;
                    }
                }

                // Auto-fill source OTB info by tracing back the cable
                $sourceInfo = $this->traceSourceFromCable($validated['cable_1_id'], $validated['cable_1_core']);
                if ($sourceInfo) {
                    if (empty($validated['source_otb_id'])) {
                        $validated['source_otb_id'] = $sourceInfo['source_otb_id'];
                    }
                    if (empty($validated['source_otb_name'])) {
                        $validated['source_otb_name'] = $sourceInfo['source_otb_name'];
                    }
                    if (empty($validated['source_port'])) {
                        $validated['source_port'] = $sourceInfo['source_port'];
                    }
                    // Also propagate client_name from source if not set
                    if (empty($validated['client_name']) && $sourceInfo['client_name']) {
                        $validated['client_name'] = $sourceInfo['client_name'];
                    }
                    if (empty($validated['client_area']) && $sourceInfo['client_area']) {
                        $validated['client_area'] = $sourceInfo['client_area'];
                    }
                }
            }

            $splice = Splice::create($validated);

            // Handle image upload
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $imagePath = $image->storeAs('splice-images', $imageName, 'public');

                $splice->update([
                    'image_path' => $imagePath,
                    'image_name' => $image->getClientOriginalName(),
                ]);
            }

            // Update core status to spliced for cable 2
            if ($validated['cable_2_id']) {
                Core::where('cable_id', $validated['cable_2_id'])
                    ->where('core_number', $validated['cable_2_core'])
                    ->update(['status' => 'spliced']);
            }

            // Auto-update OTB port status to allocated when splice is created
            // This applies to both OTB and Joint Box splices
            if ($validated['source_otb_id'] && $validated['source_port']) {
                Port::where('infrastructure_id', $validated['source_otb_id'])
                    ->where('port_number', $validated['source_port'])
                    ->update([
                        'status' => 'allocated',
                        'client_name' => $validated['client_name'] ?? '',
                        'client_area' => $validated['client_area'] ?? '',
                        'allocation_date' => now(),
                    ]);
            }

            DB::commit();
            return response()->json($splice->load(['cable1', 'cable2']), 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified splice
     */
    public function show(Splice $splice)
    {
        return response()->json($splice->load(['cable1', 'cable2', 'jointBoxInfrastructure']));
    }

    /**
     * Update a splice
     */
    public function update(Request $request, Splice $splice)
    {
        $validated = $request->validate([
            'splice_type' => 'sometimes|required|in:otb,closure,tray,termination,odp,odc,rozet',
            'splice_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'client_name' => 'nullable|string',
            'client_area' => 'nullable|string',
        ]);

        $splice->update($validated);

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($splice->image_path) {
                \Storage::disk('public')->delete($splice->image_path);
            }

            $image = $request->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $imagePath = $image->storeAs('splice-images', $imageName, 'public');

            $splice->update([
                'image_path' => $imagePath,
                'image_name' => $image->getClientOriginalName(),
            ]);
        }

        return response()->json($splice);
    }

    /**
     * Upload image for a splice
     */
    public function uploadImage(Request $request, Splice $splice)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        // Delete old image if exists
        if ($splice->image_path) {
            \Storage::disk('public')->delete($splice->image_path);
        }

        $image = $request->file('image');
        $imageName = time() . '_' . $image->getClientOriginalName();
        $imagePath = $image->storeAs('splice-images', $imageName, 'public');

        $splice->update([
            'image_path' => $imagePath,
            'image_name' => $image->getClientOriginalName(),
        ]);

        return response()->json($splice);
    }

    /**
     * Delete image from a splice
     */
    public function deleteImage(Splice $splice)
    {
        if ($splice->image_path) {
            \Storage::disk('public')->delete($splice->image_path);
            $splice->update([
                'image_path' => null,
                'image_name' => null,
            ]);
        }

        return response()->json($splice);
    }

    /**
     * Delete a splice
     */
    public function destroy(Splice $splice)
    {
        DB::beginTransaction();
        try {
            // Get cable info before deleting
            $cable1Id = $splice->cable_1_id;
            $cable1Core = $splice->cable_1_core;
            $cable2Id = $splice->cable_2_id;
            $cable2Core = $splice->cable_2_core;

            $splice->delete();

            // Update core status back to available
            Core::where('cable_id', $cable1Id)
                ->where('core_number', $cable1Core)
                ->update(['status' => 'available']);

            Core::where('cable_id', $cable2Id)
                ->where('core_number', $cable2Core)
                ->update(['status' => 'available']);

            // Also update OTB port back to available when splice is deleted
            if ($splice->source_otb_id && $splice->source_port) {
                Port::where('infrastructure_id', $splice->source_otb_id)
                    ->where('port_number', $splice->source_port)
                    ->update([
                        'status' => 'available',
                        'client_name' => null,
                        'client_area' => null,
                        'allocation_date' => null,
                    ]);
            }

            DB::commit();
            return response()->json(['message' => 'Splice deleted successfully']);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Trace client info from cable and core
     * Returns: OTB name, port number, client info if cable is connected to OTB
     */
    public function traceClient(Request $request)
    {
        $cableId = $request->input('cable_id');
        $coreNumber = $request->input('core_number');

        if (!$cableId || !$coreNumber) {
            return response()->json(['error' => 'cable_id and core_number are required'], 400);
        }

        $cable = Cable::find($cableId);
        if (!$cable) {
            return response()->json(['error' => 'Cable not found'], 404);
        }

        // Find which infrastructure this cable is connected to (OTB/ODC/ODP)
        $infrastructureId = null;
        $infrastructureName = null;

        // Check from_infrastructure
        if ($cable->from_infrastructure_id) {
            $fromInfra = Infrastructure::find($cable->from_infrastructure_id);
            if ($fromInfra && $this->isOtbType($fromInfra->type_id)) {
                $infrastructureId = $fromInfra->id;
                $infrastructureName = $fromInfra->name;
            }
        }

        // Check to_infrastructure if not found
        if (!$infrastructureId && $cable->to_infrastructure_id) {
            $toInfra = Infrastructure::find($cable->to_infrastructure_id);
            if ($toInfra && $this->isOtbType($toInfra->type_id)) {
                $infrastructureId = $toInfra->id;
                $infrastructureName = $toInfra->name;
            }
        }

        // If no OTB found, try to trace back through previous splices
        if (!$infrastructureId) {
            // Look for previous splices using this cable and core
            $previousSplice = Splice::where('cable_2_id', $cableId)
                ->where('cable_2_core', $coreNumber)
                ->first();

            if ($previousSplice) {
                // Recursively trace from cable_1 of previous splice
                return $this->traceClientFromSplice($previousSplice);
            }

            return response()->json([
                'found' => false,
                'message' => 'Cable not connected to any OTB',
            ]);
        }

        // Find the port in OTB that has this core allocated
        $port = Port::where('infrastructure_id', $infrastructureId)
            ->where('port_number', $coreNumber)
            ->first();

        // For new splices, prefer Port info over splice info
        // Port status tells us: allocated (has client), available, or maintenance
        $clientName = null;
        $clientArea = null;

        if ($port) {
            if ($port->status === 'allocated' && $port->client_name) {
                // Port is allocated - use client from port
                $clientName = $port->client_name;
                $clientArea = $port->client_area;
            } else {
                // Port is available or maintenance - return status as client
                $clientName = $port->status;
                $clientArea = '';
            }
        }

        // Only use splice info if port doesn't have info
        if (!$clientName) {
            // Check splice table for client info as fallback
            $splice = Splice::where(function($query) use ($cableId, $coreNumber) {
                $query->where('cable_2_id', $cableId)
                    ->where('cable_2_core', $coreNumber);
            })->orWhere(function($query) use ($cableId, $coreNumber) {
                $query->where('cable_1_id', $cableId)
                    ->where('cable_1_core', $coreNumber);
            })->first();

            if ($splice && $splice->client_name) {
                $clientName = $splice->client_name;
                $clientArea = $splice->client_area;
            }
        }

        return response()->json([
            'found' => true,
            'source_otb_id' => $infrastructureId,
            'source_otb_name' => $infrastructureName,
            'source_port' => $coreNumber,
            'client_name' => $clientName,
            'client_area' => $clientArea,
        ]);
    }

    /**
     * Helper: Trace source OTB from cable (for propagating client info)
     */
    private function traceSourceFromCable($cableId, $coreNumber)
    {
        $cable = Cable::find($cableId);
        if (!$cable) return null;

        // Check if cable is connected to OTB/ODC/ODP
        $infraId = null;
        $infraName = null;

        // Check from_infrastructure
        if ($cable->from_infrastructure_id) {
            $fromInfra = Infrastructure::find($cable->from_infrastructure_id);
            if ($fromInfra && $this->isOtbType($fromInfra->type_id)) {
                $infraId = $fromInfra->id;
                $infraName = $fromInfra->name;
            }
        }

        // Check to_infrastructure if not found
        if (!$infraId && $cable->to_infrastructure_id) {
            $toInfra = Infrastructure::find($cable->to_infrastructure_id);
            if ($toInfra && $this->isOtbType($toInfra->type_id)) {
                $infraId = $toInfra->id;
                $infraName = $toInfra->name;
            }
        }

        // If connected to OTB, get port info
        if ($infraId) {
            $port = Port::where('infrastructure_id', $infraId)
                ->where('port_number', $coreNumber)
                ->first();

            return [
                'source_otb_id' => $infraId,
                'source_otb_name' => $infraName,
                'source_port' => $coreNumber,
                'client_name' => $port ? $port->client_name : null,
                'client_area' => $port ? $port->client_area : null,
            ];
        }

        // If not connected to OTB directly, trace back through previous splices
        $previousSplice = Splice::where('cable_2_id', $cableId)
            ->where('cable_2_core', $coreNumber)
            ->first();

        if ($previousSplice) {
            // Recursively trace from previous splice's source
            $sourceInfo = null;

            // Get source from previous splice if available
            if ($previousSplice->source_otb_id) {
                $sourceInfo = [
                    'source_otb_id' => $previousSplice->source_otb_id,
                    'source_otb_name' => $previousSplice->source_otb_name,
                    'source_port' => $previousSplice->source_port,
                    'client_name' => $previousSplice->client_name,
                    'client_area' => $previousSplice->client_area,
                ];
            } else if ($previousSplice->cable_1_id) {
                // Trace further back
                $sourceInfo = $this->traceSourceFromCable($previousSplice->cable_1_id, $previousSplice->cable_1_core);
            }

            return $sourceInfo;
        }

        return null;
    }

    /**
     * Helper: Check if infrastructure type is OTB/ODC/ODP
     */
    private function isOtbType($typeId)
    {
        // Get the type name from infrastructure_types table
        $type = \DB::table('infrastructure_types')->where('id', $typeId)->first();
        if (!$type) return false;

        $typeName = strtolower($type->name);
        return str_contains($typeName, 'otb') ||
               str_contains($typeName, 'odc') ||
               str_contains($typeName, 'odp') ||
               str_contains($typeName, 'olt');
    }

    /**
     * Helper: Trace client from a previous splice
     */
    private function traceClientFromSplice(Splice $splice)
    {
        $cable = Cable::find($splice->cable_1_id);
        if (!$cable) {
            return response()->json(['found' => false, 'message' => 'Cable not found']);
        }

        // Check from_infrastructure
        if ($cable->from_infrastructure_id) {
            $fromInfra = Infrastructure::find($cable->from_infrastructure_id);
            if ($fromInfra && $this->isOtbType($fromInfra->type_id)) {
                $port = Port::where('infrastructure_id', $fromInfra->id)
                    ->where('port_number', $splice->cable_1_core)
                    ->first();

                return response()->json([
                    'found' => true,
                    'source_otb_id' => $fromInfra->id,
                    'source_otb_name' => $fromInfra->name,
                    'source_port' => $splice->cable_1_core,
                    'client_name' => $port ? $port->client_name : null,
                    'client_area' => $port ? $port->client_area : null,
                ]);
            }
        }

        // Check to_infrastructure
        if ($cable->to_infrastructure_id) {
            $toInfra = Infrastructure::find($cable->to_infrastructure_id);
            if ($toInfra && $this->isOtbType($toInfra->type_id)) {
                $port = Port::where('infrastructure_id', $toInfra->id)
                    ->where('port_number', $splice->cable_1_core)
                    ->first();

                return response()->json([
                    'found' => true,
                    'source_otb_id' => $toInfra->id,
                    'source_otb_name' => $toInfra->name,
                    'source_port' => $splice->cable_1_core,
                    'client_name' => $port ? $port->client_name : null,
                    'client_area' => $port ? $port->client_area : null,
                ]);
            }
        }

        // Continue tracing back
        $prevSplice = Splice::where('cable_2_id', $splice->cable_1_id)
            ->where('cable_2_core', $splice->cable_1_core)
            ->first();

        if ($prevSplice) {
            return $this->traceClientFromSplice($prevSplice);
        }

        return response()->json([
            'found' => false,
            'message' => 'Could not trace back to OTB',
        ]);
    }
}
