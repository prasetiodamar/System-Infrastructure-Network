<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LibreNMSDeviceCategory extends Model
{
    protected $table = 'librenms_device_categories';

    protected $fillable = [
        'librenms_device_id',
        'category',
    ];

    protected $casts = [
        'librenms_device_id' => 'integer',
    ];
}
