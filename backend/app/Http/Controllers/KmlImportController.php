<?php

namespace App\Http\Controllers;

use App\Models\Infrastructure;
use App\Models\InfrastructureType;
use Illuminate\Http\Request;
use SimpleXMLElement;
use ZipArchive;

class KmlImportController extends Controller
{
    /**
     * Parse KML/KMZ file and return line data
     */
    public function parseKml(Request $request)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Custom validation for KML/KMZ files
        $request->validate([
            'file' => 'required|file|max:10240'
        ], [
            'file.required' => 'File is required',
            'file.file' => 'File must be a valid file',
            'file.max' => 'File size must not exceed 10MB'
        ]);

        // Validate file extension manually
        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        if (!in_array($extension, ['kml', 'kmz'])) {
            return response()->json([
                'message' => 'The file field must be a file of type: kml, kmz.'
            ], 422);
        }

        try {
            $file = $request->file('file');
            $kmlContent = $this->extractKmlContent($file);

            if (!$kmlContent) {
                return response()->json(['message' => 'Invalid KML/KMZ file'], 400);
            }

            $lines = $this->parseKmlContent($kmlContent);

            // If no lines found, provide helpful error message
            if (empty($lines)) {
                return response()->json([
                    'message' => 'No cable routes found in the file. Make sure your KML contains LineString or Point elements inside Placemarks.',
                    'details' => 'The parser looked for Placemark elements containing either LineString (for cable routes) or Point (for locations) but found none with valid coordinates.'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'lines' => $lines,
                'count' => count($lines)
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error parsing KML: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Import parsed KML data as infrastructure records
     */
    public function importLines(Request $request)
    {
        // Admin only
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'type_id' => 'required|exists:infrastructure_types,id',
            'lines' => 'required|array',
            'lines.*.name' => 'required|string',
            'lines.*.coordinates' => 'required|array',
            'lines.*.cable_length' => 'nullable|numeric'
        ]);

        try {
            $typeId = $request->input('type_id');
            $lines = $request->input('lines');
            $created = [];

            foreach ($lines as $lineData) {
                $coordinates = $lineData['coordinates'];

                if (count($coordinates) >= 2) {
                    // Get first point as location
                    $firstPoint = $coordinates[0];

                    $infrastructure = Infrastructure::create([
                        'type_id' => $typeId,
                        'name' => $lineData['name'],
                        'latitude' => $firstPoint[0],
                        'longitude' => $firstPoint[1],
                        'path_coordinates' => json_encode($coordinates),
                        'cable_length' => $lineData['cable_length'] ?? 0,
                        'status' => 'active',
                        'description' => 'Imported from KML/KMZ'
                    ]);

                    $created[] = $infrastructure;
                }
            }

            return response()->json([
                'success' => true,
                'message' => count($created) . ' infrastructure(s) imported successfully',
                'created' => $created
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error importing: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Extract KML content from file (handle both KML and KMZ)
     */
    private function extractKmlContent($file)
    {
        try {
            $extension = strtolower($file->getClientOriginalExtension());

            if ($extension === 'kmz') {
                // KMZ is a ZIP file
                $zip = new ZipArchive();

                // Use Laravel's storage temp directory
                $tempDir = storage_path('app/temp');
                if (!file_exists($tempDir)) {
                    mkdir($tempDir, 0755, true);
                }

                $tempPath = 'temp_kml_' . time() . '_' . uniqid() . '.kmz';
                $fullPath = $tempDir . DIRECTORY_SEPARATOR . $tempPath;

                // Get file content and write to temp location
                $fileContent = file_get_contents($file->getRealPath());
                if ($fileContent === false) {
                    throw new \Exception('Failed to read uploaded file');
                }

                if (file_put_contents($fullPath, $fileContent) === false) {
                    throw new \Exception('Failed to store KMZ file');
                }

                if ($zip->open($fullPath) === true) {
                    // Look for .kml file in the zip
                    for ($i = 0; $i < $zip->numFiles; $i++) {
                        $name = $zip->getNameIndex($i);
                        if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'kml') {
                            $kmlContent = $zip->getFromName($name);
                            $zip->close();
                            if (file_exists($fullPath)) {
                                unlink($fullPath);
                            }
                            if (!$kmlContent) {
                                throw new \Exception('Could not extract KML from KMZ');
                            }
                            return $kmlContent;
                        }
                    }
                    $zip->close();
                    if (file_exists($fullPath)) {
                        unlink($fullPath);
                    }
                    throw new \Exception('No KML file found in KMZ archive');
                } else {
                    if (file_exists($fullPath)) {
                        unlink($fullPath);
                    }
                    throw new \Exception('Failed to open KMZ file');
                }
            } else if ($extension === 'kml') {
                // Direct KML file
                $content = $file->get();
                if (!$content) {
                    throw new \Exception('Failed to read KML file');
                }
                return $content;
            } else {
                throw new \Exception('Invalid file extension: ' . $extension);
            }
        } catch (\Exception $e) {
            throw new \Exception('Extract error: ' . $e->getMessage());
        }
    }

    /**
     * Parse KML content and extract line strings (paths)
     */
    private function parseKmlContent($kmlContent)
    {
        try {
            // Suppress XML errors and load with proper settings
            libxml_use_internal_errors(true);
            $xml = simplexml_load_string($kmlContent, 'SimpleXMLElement', LIBXML_NOCDATA);
            libxml_clear_errors();

            if ($xml === false) {
                throw new \Exception('Invalid XML/KML format');
            }

            $lines = [];

            // Use XPath to find ALL Placemarks regardless of nesting/namespace
            // This handles both plain KML and KML with namespaces
            $placemarks = $xml->xpath('//Placemark');
            if (empty($placemarks)) {
                $placemarks = $xml->xpath('//kml:Placemark');
            }
            if (empty($placemarks)) {
                // Last resort: try to get any Placemark directly
                $placemarks = isset($xml->Placemark) ? $xml->Placemark : [];
            }

            // Convert single element to array if needed
            if ($placemarks && !is_array($placemarks)) {
                $placemarks = [$placemarks];
            }

            // Process each Placemark
            foreach ($placemarks as $placemark) {
                $name = isset($placemark->name) ? (string)$placemark->name : 'Imported Cable';

                // Try to find LineString (for cables/paths)
                $lineString = null;

                // Method 1: Direct access
                if (isset($placemark->LineString)) {
                    $lineString = $placemark->LineString;
                }

                // Method 2: XPath within placemark
                if (!$lineString) {
                    $lineStrings = $placemark->xpath('.//LineString');
                    if (!empty($lineStrings)) {
                        $lineString = $lineStrings[0];
                    }
                }

                // Method 3: Try namespace xpath
                if (!$lineString) {
                    $lineStrings = $placemark->xpath('.//kml:LineString');
                    if (!empty($lineStrings)) {
                        $lineString = $lineStrings[0];
                    }
                }

                // If we found a LineString, parse it
                if ($lineString !== null && isset($lineString->coordinates)) {
                    $coordinates = (string)$lineString->coordinates;
                    $coords = $this->parseCoordinates($coordinates);

                    if (count($coords) >= 2) {
                        $lines[] = [
                            'name' => $name,
                            'coordinates' => $coords,
                            'cable_length' => $this->calculateCableLength($coords)
                        ];
                    }
                } else {
                    // Also try to find Points (single location)
                    $point = null;

                    // Method 1: Direct access
                    if (isset($placemark->Point)) {
                        $point = $placemark->Point;
                    }

                    // Method 2: XPath within placemark
                    if (!$point) {
                        $points = $placemark->xpath('.//Point');
                        if (!empty($points)) {
                            $point = $points[0];
                        }
                    }

                    // Method 3: Try namespace xpath
                    if (!$point) {
                        $points = $placemark->xpath('.//kml:Point');
                        if (!empty($points)) {
                            $point = $points[0];
                        }
                    }

                    // If we found a Point, parse it
                    if ($point !== null && isset($point->coordinates)) {
                        $coordinates = (string)$point->coordinates;
                        $coords = $this->parseCoordinates($coordinates);

                        if (count($coords) === 1) {
                            $lines[] = [
                                'name' => $name,
                                'coordinates' => $coords,
                                'type' => 'point'
                            ];
                        }
                    }
                }
            }

            return $lines;
        } catch (\Exception $e) {
            throw $e;
        }
    }

    /**
     * Parse coordinate string from KML
     * Format: "lon,lat,alt lon,lat,alt ..."
     */
    private function parseCoordinates($coordinateString)
    {
        $coords = [];
        $coordinateString = trim($coordinateString);

        if (empty($coordinateString)) {
            return $coords;
        }

        $points = explode(' ', $coordinateString);

        foreach ($points as $point) {
            $point = trim($point);
            if (empty($point)) {
                continue;
            }

            $parts = explode(',', $point);
            if (count($parts) >= 2) {
                $coords[] = [
                    floatval($parts[1]), // latitude
                    floatval($parts[0])  // longitude
                ];
            }
        }

        return $coords;
    }

    /**
     * Calculate cable length using Haversine formula
     */
    private function calculateCableLength($coordinates)
    {
        if (count($coordinates) < 2) {
            return 0;
        }

        $cableLength = 0;
        $R = 6371000; // Earth radius in meters

        for ($i = 0; $i < count($coordinates) - 1; $i++) {
            $from = $coordinates[$i];
            $to = $coordinates[$i + 1];

            $lat1 = $from[0] * M_PI / 180;
            $lat2 = $to[0] * M_PI / 180;
            $deltaLat = ($to[0] - $from[0]) * M_PI / 180;
            $deltaLng = ($to[1] - $from[1]) * M_PI / 180;

            $a = sin($deltaLat / 2) * sin($deltaLat / 2) +
                 cos($lat1) * cos($lat2) * sin($deltaLng / 2) * sin($deltaLng / 2);
            $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
            $cableLength += $R * $c;
        }

        return $cableLength;
    }
}
