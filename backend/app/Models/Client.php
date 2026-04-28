<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'latitude',
        'longitude',
        'package_type',
        'monthly_fee',
        'installation_date',
        'status',
        'site_id',
        'splitter_port_id',
        'notes',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'monthly_fee' => 'decimal:2',
        'installation_date' => 'date',
    ];

    /**
     * Site that this client belongs to
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /**
     * Splitter port this client is connected to
     */
    public function splitterPort(): BelongsTo
    {
        return $this->belongsTo(SplitterPort::class);
    }

    /**
     * Client connections to infrastructure
     */
    public function connections(): HasMany
    {
        return $this->hasMany(ClientConnection::class);
    }

    /**
     * Get active connection
     */
    public function activeConnection()
    {
        return $this->connections()->latest()->first();
    }

    /**
     * Get infrastructure this client is connected to
     */
    public function infrastructure()
    {
        return $this->hasOneThrough(
            Infrastructure::class,
            ClientConnection::class,
            'client_id',
            'id',
            'id',
            'infrastructure_id'
        );
    }
}
