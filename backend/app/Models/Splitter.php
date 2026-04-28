<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Splitter extends Model
{
    protected $fillable = [
        'name',
        'infrastructure_id',
        'ratio',
        'port_count',
        'type',
        'location',
        'notes',
        'is_active',
        'input_pigtail_id',
    ];

    protected $casts = [
        'port_count' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Parent ODC infrastructure
     */
    public function infrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'infrastructure_id');
    }

    /**
     * Splitter ports
     */
    public function ports(): HasMany
    {
        return $this->hasMany(SplitterPort::class, 'splitter_id');
    }

    /**
     * Input pigtail connection
     */
    public function pigtail(): BelongsTo
    {
        return $this->belongsTo(Pigtail::class, 'input_pigtail_id');
    }

    /**
     * Get available ports count
     */
    public function getAvailablePortsCountAttribute(): int
    {
        return $this->ports()->where('status', 'available')->count();
    }

    /**
     * Get used ports count
     */
    public function getUsedPortsCountAttribute(): int
    {
        return $this->ports()->where('status', 'used')->count();
    }

    /**
     * Get ratio number (e.g., 8 from "1:8")
     */
    public function getRatioNumberAttribute(): int
    {
        $parts = explode(':', $this->ratio);
        return (int) ($parts[1] ?? 1);
    }
}
