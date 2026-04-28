<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Port extends Model
{
    protected $fillable = [
        'infrastructure_id',
        'port_number',
        'name',
        'port_type',
        'client_name',
        'client_area',
        'allocation_date',
        'status',
        'notes',
        // Connection tracking
        'connected_port_id',
        'connection_type',
        'cable_length_m',
        'cable_label',
    ];

    protected $casts = [
        'allocation_date' => 'date',
        'cable_length_m' => 'decimal:2',
    ];

    public function infrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class);
    }

    /**
     * Connected port (port-to-port connection)
     */
    public function connectedPort(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'connected_port_id');
    }

    /**
     * Reverse relationship: ports that connect to this port
     */
    public function connectedFromPorts()
    {
        return $this->hasMany(Port::class, 'connected_port_id');
    }
}
