<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LibreNMSDeviceSite extends Model
{
    protected $table = 'librenms_device_sites';

    protected $fillable = [
        'librenms_device_id',
        'site_id',
    ];

    protected $casts = [
        'librenms_device_id' => 'integer',
        'site_id' => 'integer',
    ];

    public function site()
    {
        return $this->belongsTo(Site::class);
    }
}
