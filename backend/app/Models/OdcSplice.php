<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OdcSplice extends Model
{
    protected $table = 'odc_splices';

    protected $fillable = [
        'infrastructure_id',
        'splice_tray_id',
        'pigtail_id',
        'cable_id',
        'feeder_core_number',
        'pigtail_position',
        'splice_type',
        'loss_db',
        'notes',
    ];

    protected $casts = [
        'feeder_core_number' => 'integer',
        'pigtail_position' => 'integer',
        'loss_db' => 'decimal:2',
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
     * Connected pigtail
     */
    public function pigtail(): BelongsTo
    {
        return $this->belongsTo(Pigtail::class, 'pigtail_id');
    }

    /**
     * Feeder cable
     */
    public function cable(): BelongsTo
    {
        return $this->belongsTo(Cable::class, 'cable_id');
    }
}
