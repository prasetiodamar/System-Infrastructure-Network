<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Connection extends Model
{
    protected $fillable = [
        'from_infrastructure_id',
        'to_infrastructure_id',
        'type',
        'distance',
        'description',
        'status',
        'route_coordinates',
    ];

    protected $casts = [
        'route_coordinates' => 'json',
    ];

    public function fromInfrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'from_infrastructure_id');
    }

    public function toInfrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class, 'to_infrastructure_id');
    }
}
