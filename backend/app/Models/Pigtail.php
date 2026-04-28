<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pigtail extends Model
{
    protected $fillable = [
        'infrastructure_id',
        'splice_tray_id',
        'port_number',
        'color',
        'fiber_type',
        'length_m',
        'status',
        'connected_splitter_id',
        'connected_splitter_port',
        'notes',
    ];

    protected $casts = [
        'port_number' => 'integer',
        'length_m' => 'decimal:2',
        'connected_splitter_port' => 'integer',
    ];

    /**
     * Parent ODC infrastructure
     */
    public function infrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'infrastructure_id');
    }

    /**
     * Parent splice tray
     */
    public function spliceTray(): BelongsTo
    {
        return $this->belongsTo(SpliceTray::class, 'splice_tray_id');
    }

    /**
     * Connected splitter
     */
    public function splitter(): BelongsTo
    {
        return $this->belongsTo(Splitter::class, 'connected_splitter_id');
    }
}
