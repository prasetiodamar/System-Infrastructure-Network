<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SplitterPort extends Model
{
    protected $fillable = [
        'splitter_id',
        'port_number',
        'status',
        'port_id',
        'cable_id',
        'core_number',
        'destination_infrastructure_id',
        'destination_client_id',
        'notes',
        'client_name',
        'client_area',
    ];

    protected $casts = [
        'port_number' => 'integer',
        'core_number' => 'integer',
    ];

    /**
     * Parent splitter
     */
    public function splitter(): BelongsTo
    {
        return $this->belongsTo(Splitter::class, 'splitter_id');
    }

    /**
     * Connected ODC port (via pigtail)
     */
    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'port_id');
    }

    /**
     * Distribution cable
     */
    public function cable(): BelongsTo
    {
        return $this->belongsTo(Cable::class, 'cable_id');
    }

    /**
     * Destination ODP (for ODC splitter ports)
     */
    public function destination(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'destination_infrastructure_id');
    }

    /**
     * Destination Client (for ODP splitter ports)
     */
    public function destinationClient(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'destination_client_id');
    }
}
