<?php

namespace App\Http\Controllers;

use App\Models\Infrastructure;
use App\Models\Port;
use App\Models\OdcType;
use App\Models\OdcSplice;
use Illuminate\Http\Request;

class InfrastructureController extends Controller
{
    /**
     * Display all infrastructures with relationships
     */
    public function index()
    {
        $infrastructures = Infrastructure::with('type', 'odcType', 'odpType', 'pop', 'cable', 'parent', 'site', 'rack', 'splitters', 'ports')
            ->withCount('children', 'ports', 'cablesFrom', 'cablesTo', 'splices', 'splitters')
            ->orderBy('name')
            ->get();

        // Count ODC splices separately (stored in odc_splices table, not splices table)
        $odcIds = $infrastructures->filter(fn($i) => $i->type?->category === 'odc' || $i->type?->name === 'ODC')->pluck('id');
        $odcSpliceCounts = OdcSplice::whereIn('infrastructure_id', $odcIds)->select('infrastructure_id')->selectRaw('COUNT(*) as count')->groupBy('infrastructure_id')->pluck('count', 'infrastructure_id');

        // Append customers_count and fix splices_count for ODC
        $infrastructures->each(function ($infra) use ($odcSpliceCounts) {
            $infra->customers_count = $infra->ports->where('client_name', '!=', null)->where('client_name', '!=', '')->count();
            // Override splices_count for ODC: use odc_splices count instead
            if ($infra->type?->category === 'odc' || $infra->type?->name === 'ODC') {
                $infra->splices_count = $odcSpliceCounts->get($infra->id, 0);
            }
        });

        return response()->json($infrastructures);
    }

    /**
     * Get all infrastructures for map display
     */
    public function allForMap()
    {
        $infrastructures = Infrastructure::with('type', 'pop', 'cable', 'parent', 'site', 'rack', 'connectionsFrom', 'connectionsTo')
            ->get();

        return response()->json($infrastructures);
    }

    /**
     * Get infrastructures by site
     */
    public function getBySite($siteId)
    {
        $infrastructures = Infrastructure::where('site_id', $siteId)
            ->with('type', 'parent', 'children')
            ->orderBy('hierarchy_level')
            ->orderBy('name')
            ->get();

        return response()->json($infrastructures);
    }

    /**
     * Get infrastructure hierarchy tree
     */
    public function getHierarchy($siteId = null)
    {
        $query = Infrastructure::with(['type', 'children' => function ($query) {
            $query->with('type');
        }]);

        if ($siteId) {
            $query->where('site_id', $siteId);
        }

        // Get only parent nodes (null or no parent)
        $infrastructures = $query->whereNull('parent_id')
            ->orderBy('hierarchy_level')
            ->orderBy('name')
            ->get();

        return response()->json($infrastructures);
    }

    /**
     * Get POPs with their children (for tree view)
     */
    public function getPopsWithChildren()
    {
        $pops = Infrastructure::where('hierarchy_level', 'pop')
            ->with(['type', 'site', 'children' => function ($query) {
                $query->with('type');
            }])
            ->withCount('children')
            ->orderBy('name')
            ->get();

        return response()->json($pops);
    }

    /**
     * Store a newly created infrastructure
     */
    public function store(Request $request)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'type_id' => 'required|exists:infrastructure_types,id',
            'odc_type_id' => 'nullable|exists:odc_types,id',
            'odp_type_id' => 'nullable|exists:odp_types,id',
            'name' => 'required|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'path_coordinates' => 'nullable|json',
            'cable_length' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'metadata' => 'nullable|json',
            'status' => 'required|in:active,inactive,maintenance',
            'pop_id' => 'nullable|exists:infrastructures,id',
            'cable_id' => 'nullable|exists:cables,id',
            'used_cores' => 'nullable|array',
            'used_cores.*' => 'integer',
            'parent_id' => 'nullable|exists:infrastructures,id',
            'site_id' => 'nullable|exists:sites,id',
            'rack_id' => 'nullable|exists:infrastructures,id',
            'u_position' => 'nullable|integer|min:1|max:48',
            'u_height' => 'nullable|integer|min:1|max:48',
            'hierarchy_level' => 'nullable|in:pop,distribution,access',
            // Rack fields
            'rack_type' => 'nullable|string|max:50',
            'rack_height_u' => 'nullable|integer|min:1|max:48',
            'rack_max_power_w' => 'nullable|integer|min:0',
        ]);

        // Set default hierarchy_level if not provided
        if (!isset($validated['hierarchy_level'])) {
            $validated['hierarchy_level'] = 'access';
        }

        $infrastructure = Infrastructure::create($validated);

        // Auto-generate ports for ODC based on ODC type
        if (isset($validated['odc_type_id'])) {
            $odcType = OdcType::find($validated['odc_type_id']);
            if ($odcType) {
                for ($i = 1; $i <= $odcType->port_count; $i++) {
                    Port::create([
                        'infrastructure_id' => $infrastructure->id,
                        'port_number' => $i,
                        'name' => 'Port ' . $i,
                        'status' => 'available',
                    ]);
                }
            }
        }

        // Auto-generate ports for ODP based on ODP type
        if (isset($validated['odp_type_id'])) {
            $odpType = \App\Models\OdpType::find($validated['odp_type_id']);
            if ($odpType) {
                for ($i = 1; $i <= $odpType->port_count; $i++) {
                    Port::create([
                        'infrastructure_id' => $infrastructure->id,
                        'port_number' => $i,
                        'name' => 'Port ' . $i,
                        'status' => 'available',
                    ]);
                }
            }
        }

        return response()->json($infrastructure->load('type', 'odcType', 'odpType', 'pop', 'cable', 'parent', 'site', 'children', 'ports'), 201);
    }

    /**
     * Display the specified infrastructure
     */
    public function show(Infrastructure $infrastructure)
    {
        return response()->json($infrastructure->load(
            'type',
            'odcType',
            'odpType',
            'pop',
            'cable',
            'parent',
            'parent.type',
            'site',
            'children',
            'children.type',
            'connectionsFrom',
            'connectionsTo',
            'ports'
        ));
    }

    /**
     * Update the specified infrastructure
     */
    public function update(Request $request, Infrastructure $infrastructure)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'type_id' => 'sometimes|required|exists:infrastructure_types,id',
            'odc_type_id' => 'nullable|exists:odc_types,id',
            'odp_type_id' => 'nullable|exists:odp_types,id',
            'name' => 'sometimes|required|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'path_coordinates' => 'nullable|json',
            'cable_length' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'metadata' => 'nullable|json',
            'status' => 'sometimes|required|in:active,inactive,maintenance',
            'pop_id' => 'nullable|exists:infrastructures,id',
            'cable_id' => 'nullable|exists:cables,id',
            'used_cores' => 'nullable|array',
            'used_cores.*' => 'integer',
            'parent_id' => 'nullable|exists:infrastructures,id',
            'site_id' => 'nullable|exists:sites,id',
            'rack_id' => 'nullable|exists:infrastructures,id',
            'u_position' => 'nullable|integer|min:1|max:48',
            'u_height' => 'nullable|integer|min:1|max:48',
            'hierarchy_level' => 'nullable|in:pop,distribution,access',
            // Rack fields
            'rack_type' => 'nullable|string|max:50',
            'rack_height_u' => 'nullable|integer|min:1|max:48',
            'rack_max_power_w' => 'nullable|integer|min:0',
            // LibreNMS device fields
            'librenms_device_id' => 'nullable|integer',
            'librenms_hostname' => 'nullable|string|max:255',
            'librenms_device_u_position' => 'nullable|integer|min:1',
            'librenms_device_u_height' => 'nullable|integer|min:1',
        ]);

        // Prevent circular reference (parent cannot be self as descendant)
        if (isset($validated['parent_id']) && $validated['parent_id'] == $infrastructure->id) {
            return response()->json(['message' => 'Cannot set self as parent'], 400);
        }

        $infrastructure->update($validated);

        return response()->json($infrastructure->load('type', 'pop', 'cable', 'parent', 'site', 'children'));
    }

    /**
     * Delete the specified infrastructure
     */
    public function destroy(Request $request, Infrastructure $infrastructure)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if has children
        if ($infrastructure->children()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete infrastructure with child infrastructures',
                'children_count' => $infrastructure->children()->count(),
            ], 400);
        }

        $infrastructure->delete();

        return response()->json(['message' => 'Infrastructure deleted successfully']);
    }

    /**
     * Upload images for infrastructure documentation (multiple)
     */
    public function uploadImage(Request $request, Infrastructure $infrastructure)
    {
        $request->validate([
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $images = $infrastructure->images ?? [];
        $files = $request->file('images');

        if (!$files) {
            // Single image upload (backward compatibility)
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);
            $files = [$request->file('image')];
        }

        $uploaded = [];

        foreach ($files as $image) {
            $filename = time() . '_' . uniqid() . '_' . preg_replace('/\s+/', '_', $image->getClientOriginalName());
            $path = $image->storeAs('infrastructures', $filename, 'public');

            $images[] = [
                'path' => $path,
                'name' => $image->getClientOriginalName(),
            ];
            $uploaded[] = ['path' => $path, 'name' => $image->getClientOriginalName()];
        }

        $infrastructure->update(['images' => $images]);

        return response()->json([
            'message' => 'Images uploaded successfully',
            'images' => $uploaded,
        ]);
    }

    /**
     * Delete image from infrastructure
     */
    public function deleteImage(Request $request, Infrastructure $infrastructure)
    {
        $index = $request->input('index');

        $images = $infrastructure->images ?? [];

        if ($index !== null && isset($images[$index])) {
            // Delete specific image by index
            $imageData = $images[$index];
            $path = storage_path('app/public/' . $imageData['path']);
            if (file_exists($path)) {
                unlink($path);
            }
            unset($images[$index]);
            $images = array_values($images); // Re-index array
        } else {
            // Delete all images
            foreach ($images as $imageData) {
                $path = storage_path('app/public/' . $imageData['path']);
                if (file_exists($path)) {
                    unlink($path);
                }
            }
            $images = [];
        }

        $infrastructure->update(['images' => $images]);

        return response()->json(['message' => 'Image deleted successfully']);
    }

    /**
     * Download image from infrastructure
     */
    public function downloadImage(Request $request, Infrastructure $infrastructure)
    {
        $index = $request->input('index', 0);
        $images = $infrastructure->images ?? [];

        if (!isset($images[$index])) {
            return response()->json(['message' => 'Image not found'], 404);
        }

        $imageData = $images[$index];
        $path = storage_path('app/public/' . $imageData['path']);

        if (!file_exists($path)) {
            return response()->json(['message' => 'Image file not found'], 404);
        }

        $file = file_get_contents($path);
        $type = mime_content_type($path);

        return response($file, 200)->header('Content-Type', $type)
            ->header('Content-Disposition', 'attachment; filename="' . $imageData['name'] . '"');
    }

    /**
     * Get all images for infrastructure
     */
    public function getImages(Infrastructure $infrastructure)
    {
        return response()->json([
            'images' => $infrastructure->images ?? [],
        ]);
    }
}
