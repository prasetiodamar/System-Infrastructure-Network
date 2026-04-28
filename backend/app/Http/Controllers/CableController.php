<?php

namespace App\Http\Controllers;

use App\Models\Cable;
use App\Models\Core;
use App\Http\Requests\StoreCableRequest;
use App\Http\Requests\UpdateCableRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CableController extends Controller
{
    /**
     * Standard fiber optic colors (12 colors)
     */
    private $fiberColors = [
        1 => 'Biru',      // Blue
        2 => 'Orange',    // Orange
        3 => 'Hijau',     // Green
        4 => 'Coklat',    // Brown
        5 => 'Abu',       // Grey
        6 => 'Putih',     // White
        7 => 'Merah',     // Red
        8 => 'Hitam',     // Black
        9 => 'Kuning',    // Yellow
        10 => 'Ungu',     // Violet
        11 => 'Pink',     // Pink
        12 => 'Tosca',    // Aqua/Turquoise
    ];

    /**
     * Tube colors - each tube has a distinct color for easy identification
     */
    private $tubeColors = [
        1 => 'Biru',
        2 => 'Orange',
        3 => 'Hijau',
        4 => 'Coklat',
        5 => 'Abu',
        6 => 'Putih',
        7 => 'Merah',
        8 => 'Hitam',
    ];

    /**
     * Get fiber color by core number within a tube
     */
    private function getFiberColor($coreNumberInTube)
    {
        $index = (($coreNumberInTube - 1) % 12) + 1;
        return $this->fiberColors[$index] ?? 'Unknown';
    }

    /**
     * Get tube color by tube number
     */
    private function getTubeColor($tubeNumber)
    {
        return $this->tubeColors[$tubeNumber] ?? 'Unknown';
    }

    /**
     * Get tube number for a given core number
     */
    private function getTubeNumber($coreNumber, $coresPerTube)
    {
        return ceil($coreNumber / $coresPerTube);
    }

    /**
     * Create cores with tube and color information
     */
    private function createCoresWithTubeInfo($cable, $coreCount)
    {
        // Get cable type configuration
        $cableType = $cable->cableType;
        $coresPerTube = $cableType?->cores_per_tube ?? 12;
        $tubeCount = $cableType?->tube_count ?? 1;

        // If total cores doesn't match expected, auto-calculate tube config
        if ($tubeCount * $coresPerTube != $coreCount) {
            // Try to find best fit
            for ($tubes = 1; $tubes <= 8; $tubes++) {
                if ($coreCount % $tubes === 0) {
                    $tubeCount = $tubes;
                    $coresPerTube = $coreCount / $tubes;
                    break;
                }
            }
        }

        for ($i = 1; $i <= $coreCount; $i++) {
            $coreNumberInTube = (($i - 1) % $coresPerTube) + 1;
            $tubeNumber = $this->getTubeNumber($i, $coresPerTube);

            Core::create([
                'cable_id' => $cable->id,
                'core_number' => $i,
                'tube_number' => $tubeNumber,
                'fiber_color' => $this->getFiberColor($coreNumberInTube),
                'tube_color' => $this->getTubeColor($tubeNumber),
                'status' => 'available',
            ]);
        }
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $cables = Cable::with([
            'fromInfrastructure',
            'fromInfrastructure.site',
            'fromInfrastructure.type',
            'toInfrastructure',
            'toInfrastructure.site',
            'toInfrastructure.type',
            'cableType'
        ])->get();

        // Add coordinates to from/to infrastructure from their sites if null
        // Also add a derived type_name based on infrastructure name prefix
        $cables = $cables->map(function ($cable) {
            if ($cable->fromInfrastructure) {
                $cable->fromInfrastructure->latitude = $cable->fromInfrastructure->latitude
                    ?? $cable->fromInfrastructure->site?->latitude;
                $cable->fromInfrastructure->longitude = $cable->fromInfrastructure->longitude
                    ?? $cable->fromInfrastructure->site?->longitude;

                // Always derive type from name prefix for cable display
                if ($cable->fromInfrastructure->name) {
                    $name = strtoupper($cable->fromInfrastructure->name);
                    if (strpos($name, 'OTB') !== false) {
                        $cable->fromInfrastructure->type = ['name' => 'OTB'];
                    } elseif (strpos($name, 'ODP') !== false) {
                        $cable->fromInfrastructure->type = ['name' => 'ODP'];
                    } elseif (strpos($name, 'ODC') !== false) {
                        $cable->fromInfrastructure->type = ['name' => 'ODC'];
                    } elseif (strpos($name, 'JOINT') !== false || strpos($name, 'JB') !== false) {
                        $cable->fromInfrastructure->type = ['name' => 'Joint Box'];
                    } elseif (strpos($name, 'POP') !== false) {
                        $cable->fromInfrastructure->type = ['name' => 'POP'];
                    }
                }
            }
            if ($cable->toInfrastructure) {
                $cable->toInfrastructure->latitude = $cable->toInfrastructure->latitude
                    ?? $cable->toInfrastructure->site?->latitude;
                $cable->toInfrastructure->longitude = $cable->toInfrastructure->longitude
                    ?? $cable->toInfrastructure->site?->longitude;

                // Always derive type from name prefix for cable display
                if ($cable->toInfrastructure->name) {
                    $name = strtoupper($cable->toInfrastructure->name);
                    if (strpos($name, 'OTB') !== false) {
                        $cable->toInfrastructure->type = ['name' => 'OTB'];
                    } elseif (strpos($name, 'ODP') !== false) {
                        $cable->toInfrastructure->type = ['name' => 'ODP'];
                    } elseif (strpos($name, 'ODC') !== false) {
                        $cable->toInfrastructure->type = ['name' => 'ODC'];
                    } elseif (strpos($name, 'JOINT') !== false || strpos($name, 'JB') !== false) {
                        $cable->toInfrastructure->type = ['name' => 'Joint Box'];
                    } elseif (strpos($name, 'POP') !== false) {
                        $cable->toInfrastructure->type = ['name' => 'POP'];
                    }
                }
            }
            return $cable;
        });

        return response()->json($cables);
    }

    /**
     * Store a newly created cable in storage.
     * Auto-creates cores based on core_count.
     */
    public function store(StoreCableRequest $request)
    {
        $validated = $request->validated();

        DB::beginTransaction();
        try {
            $cable = Cable::create($validated);

            // Auto-create cores with tube and color info
            $this->createCoresWithTubeInfo($cable, $cable->core_count);

            DB::commit();
            return response()->json($cable->load('cores'), 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified cable.
     */
    public function show(Cable $cable)
    {
        $cable = $cable->load(['fromInfrastructure.site', 'fromInfrastructure.type', 'toInfrastructure.site', 'toInfrastructure.type', 'cableType', 'cores']);

        // Add coordinates from site if null
        if ($cable->fromInfrastructure) {
            $cable->fromInfrastructure->latitude = $cable->fromInfrastructure->latitude
                ?? $cable->fromInfrastructure->site?->latitude;
            $cable->fromInfrastructure->longitude = $cable->fromInfrastructure->longitude
                ?? $cable->fromInfrastructure->site?->longitude;

            // Always derive type from name prefix for cable display
            if ($cable->fromInfrastructure->name) {
                $name = strtoupper($cable->fromInfrastructure->name);
                if (strpos($name, 'OTB') !== false) {
                    $cable->fromInfrastructure->type = ['name' => 'OTB'];
                } elseif (strpos($name, 'ODP') !== false) {
                    $cable->fromInfrastructure->type = ['name' => 'ODP'];
                } elseif (strpos($name, 'ODC') !== false) {
                    $cable->fromInfrastructure->type = ['name' => 'ODC'];
                } elseif (strpos($name, 'JOINT') !== false || strpos($name, 'JB') !== false) {
                    $cable->fromInfrastructure->type = ['name' => 'Joint Box'];
                } elseif (strpos($name, 'POP') !== false) {
                    $cable->fromInfrastructure->type = ['name' => 'POP'];
                }
            }
        }
        if ($cable->toInfrastructure) {
            $cable->toInfrastructure->latitude = $cable->toInfrastructure->latitude
                ?? $cable->toInfrastructure->site?->latitude;
            $cable->toInfrastructure->longitude = $cable->toInfrastructure->longitude
                ?? $cable->toInfrastructure->site?->longitude;

            // Always derive type from name prefix for cable display
            if ($cable->toInfrastructure->name) {
                $name = strtoupper($cable->toInfrastructure->name);
                if (strpos($name, 'OTB') !== false) {
                    $cable->toInfrastructure->type = ['name' => 'OTB'];
                } elseif (strpos($name, 'ODP') !== false) {
                    $cable->toInfrastructure->type = ['name' => 'ODP'];
                } elseif (strpos($name, 'ODC') !== false) {
                    $cable->toInfrastructure->type = ['name' => 'ODC'];
                } elseif (strpos($name, 'JOINT') !== false || strpos($name, 'JB') !== false) {
                    $cable->toInfrastructure->type = ['name' => 'Joint Box'];
                } elseif (strpos($name, 'POP') !== false) {
                    $cable->toInfrastructure->type = ['name' => 'POP'];
                }
            }
        }

        return response()->json($cable);
    }

    /**
     * Update the specified cable in storage.
     */
    public function update(UpdateCableRequest $request, Cable $cable)
    {
        $validated = $request->validated();

        DB::beginTransaction();
        try {
            $oldCoreCount = $cable->core_count;
            $oldCableTypeId = $cable->cable_type_id;
            $cable->update($validated);

            // Check if cable_type_id changed
            $newCableTypeId = $validated['cable_type_id'] ?? $oldCableTypeId;

            if ($oldCableTypeId != $newCableTypeId) {
                // Cable type changed - regenerate all cores with new configuration
                // First, delete all existing cores
                Core::where('cable_id', $cable->id)->delete();

                // Get new cable type configuration
                $cableType = $cable->cableType;
                $newCoreCount = $validated['core_count'] ?? $cable->core_count;
                $coresPerTube = $cableType?->cores_per_tube ?? 12;

                // Create new cores with new tube/color configuration
                $this->createCoresWithTubeInfo($cable, $newCoreCount);
            }
            // If core_count changed (but cable_type didn't), add or remove cores
            elseif (isset($validated['core_count']) && $validated['core_count'] != $oldCoreCount) {
                $newCoreCount = $validated['core_count'];

                if ($newCoreCount > $oldCoreCount) {
                    // Add new cores with tube and color info
                    $cableType = $cable->cableType;
                    $coresPerTube = $cableType?->cores_per_tube ?? 12;

                    for ($i = $oldCoreCount + 1; $i <= $newCoreCount; $i++) {
                        $coreNumberInTube = (($i - 1) % $coresPerTube) + 1;
                        $tubeNumber = $this->getTubeNumber($i, $coresPerTube);

                        Core::create([
                            'cable_id' => $cable->id,
                            'core_number' => $i,
                            'tube_number' => $tubeNumber,
                            'fiber_color' => $this->getFiberColor($coreNumberInTube),
                            'status' => 'available',
                        ]);
                    }
                } elseif ($newCoreCount < $oldCoreCount) {
                    // Remove excess cores (only if not allocated)
                    Core::where('cable_id', $cable->id)
                        ->where('core_number', '>', $newCoreCount)
                        ->where('status', 'available')
                        ->delete();
                }
            }

            DB::commit();
            return response()->json($cable->load('cores'));
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified cable from storage.
     */
    public function destroy(Cable $cable)
    {
        $cable->delete();
        return response()->json(['message' => 'Cable deleted successfully']);
    }

    /**
     * Get core summary for a cable.
     */
    public function coreSummary(Cable $cable)
    {
        $totalCores = $cable->cores()->count();
        $allocatedCores = $cable->cores()->where('status', 'allocated')->count();
        $availableCores = $cable->cores()->where('status', 'available')->count();
        $splicedCores = $cable->cores()->where('status', 'spliced')->count();
        $damagedCores = $cable->cores()->where('status', 'damaged')->count();

        return response()->json([
            'total' => $totalCores,
            'allocated' => $allocatedCores,
            'available' => $availableCores,
            'spliced' => $splicedCores,
            'damaged' => $damagedCores,
        ]);
    }

    /**
     * Get all cores for a cable.
     */
    public function cores(Cable $cable)
    {
        $cores = $cable->cores()->orderBy('core_number')->get();
        return response()->json($cores);
    }
}
