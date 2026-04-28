<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Site extends Model
{
    protected $fillable = [
        'name',
        'code',
        'latitude',
        'longitude',
        'radius_km',
        'site_type',
        'address',
        'province',
        'city',
        'district',
        'description',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'radius_km' => 'decimal:2',
        'status' => 'string',
    ];

    /**
     * Get all infrastructures in this site
     */
    public function infrastructures(): HasMany
    {
        return $this->hasMany(Infrastructure::class);
    }

    /**
     * Get POP infrastructures in this site
     */
    public function pops(): HasMany
    {
        return $this->hasMany(Infrastructure::class)->where('hierarchy_level', 'pop');
    }

    /**
     * Get active infrastructures count
     */
    public function getInfrastructuresCountAttribute(): int
    {
        return $this->infrastructures()->count();
    }

    /**
     * Get active POPs count
     */
    public function getPopsCountAttribute(): int
    {
        return $this->pops()->count();
    }

    /**
     * Scope for active sites
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for specific site type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('site_type', $type);
    }

    /**
     * Get site type label
     */
    public function getSiteTypeLabelAttribute(): string
    {
        return match($this->site_type) {
            'pop' => 'POP Site',
            'exchange' => 'Exchange',
            'datacenter' => 'Data Center',
            'tower' => 'Tower',
            'building' => 'Building',
            default => 'Unknown',
        };
    }

    /**
     * User who created this site
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * User who last updated this site
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
