<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CableType extends Model
{
    protected $fillable = [
        'name',
        'type',
        'default_core_count',
        'description',
        'color',
        'is_active',
        'tube_count',
        'cores_per_tube',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get all cables for this cable type
     */
    public function cables()
    {
        return $this->hasMany(Cable::class);
    }

    /**
     * Scope to get only active cable types
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
