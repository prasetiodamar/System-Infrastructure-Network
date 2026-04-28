<?php

namespace App\Http\Controllers;

use App\Models\Infrastructure;
use App\Models\InfrastructureType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RackController extends Controller
{
    /**
     * Get all racks
     */
    public function index(): JsonResponse
    {
        $rackType = InfrastructureType::where('category', 'rack')->pluck('id');

        $racks = Infrastructure::whereIn('type_id', $rackType)
            ->with(['type', 'site', 'rackDevices' => function ($query) {
                $query->with('type')->orderBy('u_position');
            }])
            ->withCount('rackDevices')
            ->orderBy('name')
            ->get()
            ->map(function ($rack) {
                // Ensure images field is included
                $rack->images = $rack->images ?? [];
                return $rack;
            });

        return response()->json($racks);
    }

    /**
     * Get rack detail with devices
     */
    public function show(string $id): JsonResponse
    {
        $rack = Infrastructure::with([
            'type',
            'site',
            'rackDevices' => function ($query) {
                $query->with('type')->orderBy('u_position');
            },
            'rackDevices.ports'
        ])->findOrFail($id);

        // Calculate rack statistics
        $rack->capacity_percent = $rack->rack_height_u > 0
            ? round(($rack->rack_used_u / $rack->rack_height_u) * 100, 1)
            : 0;

        $rack->available_u = $rack->rack_height_u - $rack->rack_used_u;

        // Calculate power usage
        $rack->total_power_w = $rack->rackDevices()->sum('power_w');

        return response()->json($rack);
    }

    /**
     * Get available U positions in rack
     */
    public function getAvailablePositions(string $rackId): JsonResponse
    {
        $rack = Infrastructure::findOrFail($rackId);

        if (!$rack->rack_height_u) {
            return response()->json(['error' => 'Not a rack'], 400);
        }

        // Get all occupied positions
        $occupied = Infrastructure::where('rack_id', $rackId)
            ->where('id', '!=', $rackId)
            ->get()
            ->map(function ($device) {
                return [
                    'start' => $device->u_position,
                    'end' => $device->u_position + $device->u_height - 1,
                ];
            });

        // Calculate available slots
        $available = [];
        $currentU = 1;

        while ($currentU <= $rack->rack_height_u) {
            $isOccupied = false;

            foreach ($occupied as $slot) {
                if ($currentU >= $slot['start'] && $currentU <= $slot['end']) {
                    $isOccupied = true;
                    $currentU = $slot['end'] + 1;
                    break;
                }
            }

            if (!$isOccupied) {
                $available[] = ['u' => $currentU];
                $currentU++;
            }
        }

        return response()->json([
            'rack_height_u' => $rack->rack_height_u,
            'available_positions' => $available,
        ]);
    }

    /**
     * Validate U position availability
     */
    public function validatePosition(Request $request, string $rackId): JsonResponse
    {
        $request->validate([
            'u_position' => 'required|integer|min:1',
            'u_height' => 'required|integer|min:1',
            'exclude_infrastructure_id' => 'nullable|integer',
        ]);

        $rack = Infrastructure::findOrFail($rackId);
        $uPosition = $request->u_position;
        $uHeight = $request->u_height;
        $excludeId = $request->exclude_infrastructure_id;

        // Check if fits in rack
        if ($uPosition + $uHeight - 1 > $rack->rack_height_u) {
            return response()->json([
                'valid' => false,
                'error' => 'Device does not fit in rack',
            ]);
        }

        // Check for overlap
        $endU = $uPosition + $uHeight - 1;

        $overlap = Infrastructure::where('rack_id', $rackId)
            ->where('id', '!=', $rackId)
            ->when($excludeId, function ($query) use ($excludeId) {
                return $query->where('id', '!=', $excludeId);
            })
            ->where(function ($query) use ($uPosition, $endU) {
                $query->where(function ($q) use ($uPosition, $endU) {
                    // Overlap exists if:
                    // (device.start <= new.end) AND (device.end >= new.start)
                    $q->whereRaw('(u_position + u_height - 1) >= ?', [$uPosition])
                      ->whereRaw('u_position <= ?', [$endU]);
                });
            })
            ->exists();

        return response()->json([
            'valid' => !$overlap,
            'error' => $overlap ? 'Position overlaps with existing device' : null,
        ]);
    }
}
