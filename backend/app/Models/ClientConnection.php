<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientConnection extends Model
{
    protected $fillable = [
        'client_id',
        'infrastructure_id',
        'splitter_port_id',
        'splice_id',
        'cable_id',
        'core_number',
        'cable_length_m',
        'ont_serial',
        'ont_model',
        'ip_address',
        'connection_type',
        'connection_date',
        'notes',
    ];

    protected $casts = [
        'cable_length_m' => 'decimal:2',
        'core_number' => 'integer',
        'connection_date' => 'date',
    ];

    /**
     * Client
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Infrastructure (ODP, Joint Box, OTB)
     */
    public function infrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class);
    }

    /**
     * Splitter Port (for ODP connections)
     */
    public function splitterPort(): BelongsTo
    {
        return $this->belongsTo(SplitterPort::class);
    }

    /**
     * Splice (for Joint Box connections)
     */
    public function splice(): BelongsTo
    {
        return $this->belongsTo(Splice::class);
    }

    /**
     * Drop Cable
     */
    public function cable(): BelongsTo
    {
        return $this->belongsTo(Cable::class);
    }
}
