<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Infrastructure extends Model
{
    protected $fillable = [
        'type_id',
        'odc_type_id',
        'odp_type_id',
        'name',
        'latitude',
        'longitude',
        'path_coordinates',
        'cable_length',
        'description',
        'metadata',
        'status',
        'pop_id',
        'cable_id',
        'used_cores',
        'parent_id',
        'site_id',
        'hierarchy_level',
        // Rack support
        'rack_id',
        'u_position',
        'u_height',
        'room',
        'floor',
        'rack_height_u',
        'rack_type',
        'rack_used_u',
        'rack_max_power_w',
        'power_w',
        // Created/Updated by
        'created_by',
        'updated_by',
        // Image documentation (multiple images)
        'images',
        // LibreNMS device link
        'librenms_device_id',
        'librenms_hostname',
        'librenms_device_u_position',
        'librenms_device_u_height',
    ];

    protected $casts = [
        'metadata' => 'json',
        'path_coordinates' => 'json',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'images' => 'array',
        'cable_length' => 'decimal:2',
        'used_cores' => 'array',
    ];

    public function type(): BelongsTo
    {
        return $this->belongsTo(InfrastructureType::class, 'type_id');
    }

    /**
     * ODC type (for ODC infrastructure)
     */
    public function odcType(): BelongsTo
    {
        return $this->belongsTo(OdcType::class, 'odc_type_id');
    }

    /**
     * ODP type (for ODP infrastructure)
     */
    public function odpType(): BelongsTo
    {
        return $this->belongsTo(OdpType::class, 'odp_type_id');
    }

    /**
     * Splitters in this ODC
     */
    public function splitters(): HasMany
    {
        return $this->hasMany(Splitter::class, 'infrastructure_id');
    }

    /**
     * Parent infrastructure (for hierarchy)
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'parent_id');
    }

    /**
     * Child infrastructures (for hierarchy)
     */
    public function children(): HasMany
    {
        return $this->hasMany(Infrastructure::class, 'parent_id');
    }

    /**
     * Site that owns this infrastructure
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class, 'site_id');
    }

    /**
     * Rack that contains this infrastructure (if device is in rack)
     */
    public function rack(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'rack_id');
    }

    /**
     * Devices contained in this rack (if this infrastructure is a rack)
     */
    public function rackDevices(): HasMany
    {
        return $this->hasMany(Infrastructure::class, 'rack_id')
            ->orderBy('u_position');
    }

    /**
     * Recursive children (all descendants)
     */
    public function descendants(): HasMany
    {
        return $this->children()->with('descendants');
    }

    public function pop(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'pop_id');
    }

    public function cable(): BelongsTo
    {
        return $this->belongsTo(Cable::class, 'cable_id');
    }

    public function connectionsFrom(): HasMany
    {
        return $this->hasMany(Connection::class, 'from_infrastructure_id');
    }

    public function connectionsTo(): HasMany
    {
        return $this->hasMany(Connection::class, 'to_infrastructure_id');
    }

    public function ports(): HasMany
    {
        return $this->hasMany(Port::class);
    }

    public function cablesFrom(): HasMany
    {
        return $this->hasMany(Cable::class, 'from_infrastructure_id');
    }

    public function cablesTo(): HasMany
    {
        return $this->hasMany(Cable::class, 'to_infrastructure_id');
    }

    public function splices(): HasMany
    {
        return $this->hasMany(Splice::class, 'joint_box_infrastructure_id');
    }

    /**
     * Splice trays in this ODC
     */
    public function spliceTrays(): HasMany
    {
        return $this->hasMany(SpliceTray::class, 'infrastructure_id');
    }

    /**
     * Pigtails in this ODC
     */
    public function pigtails(): HasMany
    {
        return $this->hasMany(Pigtail::class, 'infrastructure_id');
    }

    /**
     * ODC splices (feeder to pigtail connections)
     */
    public function odcSplices(): HasMany
    {
        return $this->hasMany(OdcSplice::class, 'infrastructure_id');
    }
}
