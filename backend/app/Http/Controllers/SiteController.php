<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Models\Infrastructure;
use App\Models\Cable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SiteController extends Controller
{
    /**
     * Calculate coverage radius from connected cables.
     */
    private function calculateCoverageRadius(Site $site): ?float
    {
        if (!$site->latitude || !$site->longitude) {
            return null;
        }

        // Get all infrastructure IDs in this site
        $infrastructureIds = $site->infrastructures()->pluck('id');

        if ($infrastructureIds->isEmpty()) {
            return null;
        }

        // Get all cables connected to these infrastructures
        $cables = Cable::whereIn('from_infrastructure_id', $infrastructureIds)
            ->orWhereIn('to_infrastructure_id', $infrastructureIds)
            ->get();

        if ($cables->isEmpty()) {
            return null;
        }

        $maxDistance = 0;
        $siteLat = floatval($site->latitude);
        $siteLng = floatval($site->longitude);

        foreach ($cables as $cable) {
            // Check path_coordinates for cable
            if ($cable->path_coordinates && is_array($cable->path_coordinates)) {
                foreach ($cable->path_coordinates as $coord) {
                    if (is_array($coord) && count($coord) >= 2) {
                        $distance = $this->calculateDistance(
                            $siteLat, $siteLng,
                            floatval($coord[0]), floatval($coord[1])
                        );
                        $maxDistance = max($maxDistance, $distance);
                    }
                }
            }

            // Also check the other endpoint infrastructure
            if ($cable->toInfrastructure && $cable->toInfrastructure->latitude && $cable->toInfrastructure->longitude) {
                $toInfra = $cable->toInfrastructure;
                if (!in_array($toInfra->id, $infrastructureIds->toArray())) {
                    $distance = $this->calculateDistance(
                        $siteLat, $siteLng,
                        floatval($toInfra->latitude), floatval($toInfra->longitude)
                    );
                    $maxDistance = max($maxDistance, $distance);
                }
            }

            if ($cable->fromInfrastructure && $cable->fromInfrastructure->latitude && $cable->fromInfrastructure->longitude) {
                $fromInfra = $cable->fromInfrastructure;
                if (!in_array($fromInfra->id, $infrastructureIds->toArray())) {
                    $distance = $this->calculateDistance(
                        $siteLat, $siteLng,
                        floatval($fromInfra->latitude), floatval($fromInfra->longitude)
                    );
                    $maxDistance = max($maxDistance, $distance);
                }
            }
        }

        return $maxDistance > 0 ? round($maxDistance, 2) : null;
    }

    /**
     * Calculate distance between two coordinates in kilometers using Haversine formula.
     */
    private function calculateDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371; // km

        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        $deltaLat = deg2rad($lat2 - $lat1);
        $deltaLng = deg2rad($lng2 - $lng1);

        $a = sin($deltaLat / 2) * sin($deltaLat / 2) +
            cos($lat1Rad) * cos($lat2Rad) *
            sin($deltaLng / 2) * sin($deltaLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Display a listing of all sites.
     */
    public function index()
    {
        $sites = Site::with(['infrastructures', 'pops'])
            ->withCount('infrastructures', 'pops')
            ->orderBy('name')
            ->get();

        return response()->json($sites);
    }

    /**
     * Get sites for map display (with minimal data).
     */
    public function map()
    {
        $sites = Site::active()
            ->select('id', 'name', 'code', 'latitude', 'longitude', 'radius_km', 'site_type')
            ->get();

        return response()->json($sites);
    }

    /**
     * Store a newly created site.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:sites,code',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'radius_km' => 'nullable|numeric|min:0|max:100',
            'site_type' => 'required|in:pop,datacenter',
            'address' => 'nullable|string',
            'province' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive,maintenance',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['updated_by'] = Auth::id();

        $site = Site::create($validated);

        // Calculate coverage radius from connected cables if lat/lng exists
        if ($site->latitude && $site->longitude) {
            $calculatedRadius = $this->calculateCoverageRadius($site);
            // Only auto-update radius if not manually provided
            if (!$request->has('radius_km') && $calculatedRadius !== null) {
                $site->update(['radius_km' => $calculatedRadius]);
            }
        }

        return response()->json($site->load(['creator']), 201);
    }

    /**
     * Display the specified site with all details.
     */
    public function show(string $id)
    {
        $site = Site::with([
            'infrastructures' => function ($query) {
                $query->with('type')->withCount('ports', 'cablesFrom', 'cablesTo');
            },
            'pops' => function ($query) {
                $query->with('type');
            },
            'creator',
            'updater',
        ])->findOrFail($id);

        // Add computed fields
        $site->infrastructures_count = $site->infrastructures->count();
        $site->pops_count = $site->pops->count();

        return response()->json($site);
    }

    /**
     * Get site with hierarchy tree (for tree view).
     */
    public function tree(string $id)
    {
        $site = Site::with([
            'pops' => function ($query) {
                $query->with(['type', 'children' => function ($q) {
                    $q->with('type');
                }]);
            },
        ])->findOrFail($id);

        return response()->json($site);
    }

    /**
     * Update the specified site.
     */
    public function update(Request $request, string $id)
    {
        $site = Site::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:sites,code,' . $id,
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'radius_km' => 'nullable|numeric|min:0|max:100',
            'site_type' => 'sometimes|required|in:pop,datacenter',
            'address' => 'nullable|string',
            'province' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive,maintenance',
        ]);

        $validated['updated_by'] = Auth::id();

        $site->update($validated);

        // Recalculate coverage radius from connected cables if lat/lng exists
        if ($site->latitude && $site->longitude) {
            $calculatedRadius = $this->calculateCoverageRadius($site);
            // Only auto-update radius if not manually provided
            if (!$request->has('radius_km') && $calculatedRadius !== null) {
                $site->update(['radius_km' => $calculatedRadius]);
            }
        }

        return response()->json($site->load(['creator', 'updater']));
    }

    /**
     * Recalculate coverage radius from connected cables.
     */
    public function recalculateRadius(string $id)
    {
        $site = Site::findOrFail($id);

        if (!$site->latitude || !$site->longitude) {
            return response()->json([
                'message' => 'Site does not have latitude/longitude coordinates',
            ], 400);
        }

        $calculatedRadius = $this->calculateCoverageRadius($site);

        if ($calculatedRadius === null) {
            return response()->json([
                'message' => 'No connected cables found for this site',
                'radius_km' => null,
            ]);
        }

        $site->update(['radius_km' => $calculatedRadius]);

        return response()->json([
            'message' => 'Coverage radius updated successfully',
            'radius_km' => $calculatedRadius,
            'site' => $site->fresh(),
        ]);
    }

    /**
     * Remove the specified site.
     */
    public function destroy(string $id)
    {
        $site = Site::findOrFail($id);

        // Check if site has infrastructures
        if ($site->infrastructures()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete site with existing infrastructures',
                'infrastructures_count' => $site->infrastructures()->count(),
            ], 400);
        }

        $site->delete();

        return response()->json(['message' => 'Site deleted successfully']);
    }

    /**
     * Get site statistics.
     */
    public function statistics()
    {
        $stats = [
            'total_sites' => Site::count(),
            'active_sites' => Site::active()->count(),
            'sites_by_type' => Site::select('site_type')
                ->selectRaw('COUNT(*) as count')
                ->groupBy('site_type')
                ->get()
                ->keyBy('site_type'),
            'sites_with_infrastructures' => Site::has('infrastructures')->count(),
            'sites_with_pops' => Site::has('pops')->count(),
        ];

        return response()->json($stats);
    }
}
