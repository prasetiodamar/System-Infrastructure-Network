<?php

namespace App\Observers;

use App\Models\Infrastructure;
use App\Models\Port;

class InfrastructureObserver
{
    /**
     * Handle the Infrastructure "created" event.
     */
    public function created(Infrastructure $infrastructure): void
    {
        // Auto-create ports based on infrastructure type configuration
        $this->createPortsForInfrastructure($infrastructure);

        // Update rack usage if device is assigned to rack
        if ($infrastructure->rack_id && $infrastructure->u_height) {
            $this->updateRackUsage($infrastructure->rack_id);
        }
    }

    /**
     * Handle the Infrastructure "updated" event.
     */
    public function updated(Infrastructure $infrastructure): void
    {
        // Check if rack assignment changed
        if ($infrastructure->isDirty('rack_id') || $infrastructure->isDirty('u_height')) {
            // Update old rack
            if ($infrastructure->getOriginal('rack_id')) {
                $this->updateRackUsage($infrastructure->getOriginal('rack_id'));
            }

            // Update new rack
            if ($infrastructure->rack_id) {
                $this->updateRackUsage($infrastructure->rack_id);
            }
        }
    }

    /**
     * Handle the Infrastructure "deleted" event.
     */
    public function deleted(Infrastructure $infrastructure): void
    {
        // Update rack usage if device was in rack
        if ($infrastructure->rack_id) {
            $this->updateRackUsage($infrastructure->rack_id);
        }
    }

    /**
     * Create ports for infrastructure based on type configuration
     */
    private function createPortsForInfrastructure(Infrastructure $infrastructure): void
    {
        if (!$infrastructure->type) {
            return;
        }

        $defaultPorts = $infrastructure->type->default_ports ?? 0;
        $portType = $infrastructure->type->port_type ?? 'copper';
        $category = $infrastructure->type->category ?? '';
        $portPattern = $infrastructure->type->port_name_pattern ?? null;
        $portGroups = $infrastructure->type->port_groups ?? 1;
        $portsPerGroup = $infrastructure->type->ports_per_group ?? $defaultPorts;

        // Only create ports if default_ports > 0 and port_type is not 'none'
        if ($defaultPorts > 0 && $portType !== 'none') {
            $portNumber = 1;

            // Handle grouped ports (like GTGH: PON-1/1, PON-1/2, ..., PON-2/1, ...)
            if ($portGroups > 1 && $portsPerGroup > 0) {
                for ($group = 1; $group <= $portGroups; $group++) {
                    for ($port = 1; $port <= $portsPerGroup; $port++) {
                        $portName = $this->generatePortName($portPattern, $category, $group, $port);
                        Port::create([
                            'infrastructure_id' => $infrastructure->id,
                            'port_number' => $portNumber,
                            'port_type' => $portType,
                            'name' => $portName,
                            'status' => 'available',
                        ]);
                        $portNumber++;
                    }
                }
            } else {
                // Simple pattern: PON-1, PON-2, ...
                for ($i = 1; $i <= $defaultPorts; $i++) {
                    $portName = $this->generatePortName($portPattern, $category, 1, $i);
                    Port::create([
                        'infrastructure_id' => $infrastructure->id,
                        'port_number' => $i,
                        'port_type' => $portType,
                        'name' => $portName,
                        'status' => 'available',
                    ]);
                }
            }
        }
    }

    /**
     * Generate port name based on pattern
     */
    private function generatePortName(?string $pattern, string $category, int $group, int $port): string
    {
        // If custom pattern is defined in infrastructure_type
        if ($pattern) {
            return str_replace(['{group}', '{port}'], [$group, $port], $pattern);
        }

        // Default patterns based on category
        return match($category) {
            'olt' => 'PON-' . $port,
            'otb' => 'PORT-' . $port,
            'odc' => 'PORT-' . $port,
            'odp' => 'PORT-' . $port,
            'switch' => 'GE-' . $port,
            'router' => 'GE-' . $port,
            'server' => 'ETH-' . $port,
            default => 'PORT-' . $port,
        };
    }

    /**
     * Get port name prefix based on infrastructure category
     */
    private function getPortPrefix(string $category): string
    {
        return match($category) {
            'olt' => 'PON',
            'otb' => 'PORT',
            'odc' => 'PORT',
            'odp' => 'PORT',
            'switch' => 'GE',
            'router' => 'GE',
            'server' => 'ETH',
            default => 'PORT',
        };
    }

    /**
     * Update rack usage (rack_used_u) based on devices in rack
     */
    private function updateRackUsage($rackId): void
    {
        $rack = Infrastructure::find($rackId);
        if (!$rack) {
            return;
        }

        // Calculate total used U space
        $usedU = Infrastructure::where('rack_id', $rackId)
            ->where('id', '!=', $rackId) // Don't count the rack itself
            ->sum('u_height') ?? 0;

        // Update rack_used_u
        $rack->update(['rack_used_u' => $usedU]);
    }
}
