<?php

namespace App\Http\Controllers;

use App\Models\LibreNMSDeviceCategory;
use Illuminate\Http\Request;

class LibreNMSCategoryController extends Controller
{
    /**
     * Get all device categories
     */
    public function index()
    {
        $categories = LibreNMSDeviceCategory::all();

        // Convert to key-value format
        $categoryMap = [];
        foreach ($categories as $cat) {
            $categoryMap[$cat->librenms_device_id] = $cat->category;
        }

        return response()->json($categoryMap);
    }

    /**
     * Update a device category
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'device_id' => 'required|integer',
            'category' => 'nullable|in:router,switch,server,olt',
        ]);

        $category = LibreNMSDeviceCategory::updateOrCreate(
            ['librenms_device_id' => $validated['device_id']],
            ['category' => $validated['category']]
        );

        return response()->json([
            'device_id' => $category->librenms_device_id,
            'category' => $category->category,
        ]);
    }

    /**
     * Bulk update categories
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'categories' => 'required|array',
            'categories.*.device_id' => 'required|integer',
            'categories.*.category' => 'nullable|in:router,switch,server,olt',
        ]);

        foreach ($validated['categories'] as $item) {
            LibreNMSDeviceCategory::updateOrCreate(
                ['librenms_device_id' => $item['device_id']],
                ['category' => $item['category']]
            );
        }

        return response()->json(['success' => true]);
    }

    /**
     * Delete a device category
     */
    public function destroy($deviceId)
    {
        LibreNMSDeviceCategory::where('librenms_device_id', $deviceId)->delete();

        return response()->json(['success' => true]);
    }
}
