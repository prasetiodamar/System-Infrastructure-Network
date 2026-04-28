<?php

namespace App\Providers;

use App\Models\Infrastructure;
use App\Observers\InfrastructureObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Infrastructure::observe(InfrastructureObserver::class);
    }
}
