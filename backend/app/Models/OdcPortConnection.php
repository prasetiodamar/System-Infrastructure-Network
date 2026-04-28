<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OdcPortConnection extends Model
{
    protected $fillable = [
        'infrastructure_id',
        'port_id',
        'connection_type',
        'pigtail_id',
        'splitter_id',
        'splitter_port_id',
        'position',
        'notes',
    ];

    /**
     * ODC Infrastructure
     */
    public function infrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'infrastructure_id');
    }

    /**
     * Port ODC
     */
    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'port_id');
    }

    /**
     * Pigtail (if connection type is pigtail)
     */
    public function pigtail(): BelongsTo
    {
        return $this->belongsTo(Pigtail::class, 'pigtail_id');
    }

    /**
     * Splitter (if connection type is splitter_input or splitter_output)
     */
    public function splitter(): BelongsTo
    {
        return $this->belongsTo(Splitter::class, 'splitter_id');
    }

    /**
     * Splitter Port (if connection type is splitter_output)
     */
    public function splitterPort(): BelongsTo
    {
        return $this->belongsTo(SplitterPort::class, 'splitter_port_id');
    }

    /**
     * Get other connections on the same port
     */
    public function getOtherConnectionOnPort()
    {
        return self::where('port_id', $this->port_id)
            ->where('id', '!=', $this->id)
            ->first();
    }

    /**
     * Check if port has available position
     */
    public static function hasAvailablePosition($portId)
    {
        $count = self::where('port_id', $portId)->count();
        return $count < 2;
    }

    /**
     * Get next available position for a port (A=1 or B=2)
     */
    public static function getNextPosition($portId)
    {
        $existing = self::where('port_id', $portId)->pluck('position')->toArray();
        if (!in_array(1, $existing)) return 1;
        if (!in_array(2, $existing)) return 2;
        return null; // Port penuh
    }
}
