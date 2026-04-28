<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Splice extends Model
{
    use HasFactory;

    protected $fillable = [
        'joint_box_infrastructure_id',
        'cable_1_id',
        'cable_1_core',
        'cable_2_id',
        'cable_2_core',
        'splice_type',
        'splice_date',
        'notes',
        // Client tracking - follows the path
        'client_name',
        'client_area',
        'source_otb_id',
        'source_otb_name',
        'source_port',
        // Image documentation
        'image_path',
        'image_name',
    ];

    protected $casts = [
        'splice_date' => 'date',
    ];

    public function jointBoxInfrastructure()
    {
        return $this->belongsTo(Infrastructure::class, 'joint_box_infrastructure_id');
    }

    public function cable1()
    {
        return $this->belongsTo(Cable::class, 'cable_1_id');
    }

    public function cable2()
    {
        return $this->belongsTo(Cable::class, 'cable_2_id');
    }

    // Get the actual core from cable 1 (using custom query)
    public function getCore1Attribute()
    {
        return Core::where('cable_id', $this->cable_1_id)
            ->where('core_number', $this->cable_1_core)
            ->first();
    }

    // Get the actual core from cable 2 (using custom query)
    public function getCore2Attribute()
    {
        return Core::where('cable_id', $this->cable_2_id)
            ->where('core_number', $this->cable_2_core)
            ->first();
    }
}
