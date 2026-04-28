<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SpliceTray extends Model
{
    protected $fillable = [
        'infrastructure_id',
        'name',
        'max_splices',
        'location',
        'notes',
    ];

    protected $casts = [
        'max_splices' => 'integer',
    ];

    /**
     * Parent ODC infrastructure
     */
    public function infrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'infrastructure_id');
    }

    /**
     * Splice tray splices
     */
    public function splices(): HasMany
    {
        return $this->hasMany(OdcSplice::class, 'splice_tray_id');
    }

    /**
     * Pigtails in this tray
     */
    public function pigtails(): HasMany
    {
        return $this->hasMany(Pigtail::class, 'splice_tray_id');
    }
}
