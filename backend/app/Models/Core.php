<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Core extends Model
{
    use HasFactory;

    protected $fillable = [
        'cable_id',
        'core_number',
        'tube_number',
        'fiber_color',
        'tube_color',
        'status',
        'client_name',
        'client_area',
        'allocation_date',
        'notes',
    ];

    protected $casts = [
        'allocation_date' => 'date',
    ];

    public function cable()
    {
        return $this->belongsTo(Cable::class);
    }

    public function splicesAsCore1()
    {
        return $this->hasMany(Splice::class, 'cable_1_core');
    }

    public function splicesAsCore2()
    {
        return $this->hasMany(Splice::class, 'cable_2_core');
    }
}
