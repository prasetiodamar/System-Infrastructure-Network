<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OdcType extends Model
{
    protected $fillable = [
        'name',
        'port_count',
        'description',
        'is_active',
    ];

    protected $casts = [
        'port_count' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get all infrastructure using this ODC type
     */
    public function infrastructures(): HasMany
    {
        return $this->hasMany(Infrastructure::class, 'odc_type_id');
    }
}
