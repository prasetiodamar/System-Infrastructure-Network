<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OdpType extends Model
{
    protected $fillable = [
        'name',
        'port_count',
        'description',
    ];

    /**
     * Get infrastructures of this type
     */
    public function infrastructures(): HasMany
    {
        return $this->hasMany(Infrastructure::class, 'odp_type_id');
    }
}
