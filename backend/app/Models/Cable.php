<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cable extends Model
{
    use HasFactory;

    protected $fillable = [
        'cable_type_id',
        'from_infrastructure_id',
        'to_infrastructure_id',
        'name',
        'length',
        'core_count',
        'brand',
        'model_type',
        'installation_date',
        'status',
        'path_coordinates',
        'notes',
    ];

    protected $casts = [
        'installation_date' => 'date',
        'path_coordinates' => 'array',
        'length' => 'decimal:2',
    ];

    public function cableType()
    {
        return $this->belongsTo(CableType::class, 'cable_type_id');
    }

    public function fromInfrastructure()
    {
        return $this->belongsTo(Infrastructure::class, 'from_infrastructure_id');
    }

    public function toInfrastructure()
    {
        return $this->belongsTo(Infrastructure::class, 'to_infrastructure_id');
    }

    public function cores()
    {
        return $this->hasMany(Core::class);
    }

    public function splicesAsCable1()
    {
        return $this->hasMany(Splice::class, 'cable_1_id');
    }

    public function splicesAsCable2()
    {
        return $this->hasMany(Splice::class, 'cable_2_id');
    }

    public function allSplices()
    {
        return $this->splicesAsCable1->union($this->splicesAsCable2);
    }
}
