<?php

namespace App\Http\Controllers;

use App\Models\LibreNMSDeviceSite;
use Illuminate\Http\Request;

class LibreNMSDeviceSiteController extends Controller
{
    /**
     * Get all device-site mappings
     */
    public function index()
    {
        $mappings = LibreNMSDeviceSite::all();

        // Convert to key-value format
        $mapping = [];
        foreach ($mappings as $m) {
            $mapping[$m->librenms_device_id] = $m->site_id;
        }

        return response()->json($mapping);
    }

    /**
     * Update a device site mapping
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'device_id' => 'required|integer',
            'site_id' => 'nullable|integer',
        ]);

        $mapping = LibreNMSDeviceSite::updateOrCreate(
            ['librenms_device_id' => $validated['device_id']],
            ['site_id' => $validated['site_id']]
        );

        return response()->json([
            'device_id' => $mapping->librenms_device_id,
            'site_id' => $mapping->site_id,
        ]);
    }

    /**
     * Delete a device site mapping
     */
    public function destroy($deviceId)
    {
        LibreNMSDeviceSite::where('librenms_device_id', $deviceId)->delete();

        return response()->json(['success' => true]);
    }
}
