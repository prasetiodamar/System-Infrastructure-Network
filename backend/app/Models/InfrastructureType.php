<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InfrastructureType extends Model
{
    protected $fillable = [
        'name',
        'icon_url',
        'description',
        'parent_id',
        'port_count',
        'is_active',
        'category',
        'default_ports',
        'port_type',
        'default_u_height',
        'default_power_w',
        'port_name_pattern',
        'port_groups',
        'ports_per_group',
    ];

    public function infrastructures(): HasMany
    {
        return $this->hasMany(Infrastructure::class, 'type_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(InfrastructureType::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(InfrastructureType::class, 'parent_id');
    }
}
