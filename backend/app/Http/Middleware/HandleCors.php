<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class HandleCors
{
    public function handle(Request $request, Closure $next)
    {
        $allowed_origins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://172.16.103.226:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
        ];

        $origin = $request->header('Origin');

        if (in_array($origin, $allowed_origins)) {
            // Handle preflight requests
            if ($request->getMethod() === 'OPTIONS') {
                return response('', 200)
                    ->header('Access-Control-Allow-Origin', $origin)
                    ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
                    ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
                    ->header('Access-Control-Allow-Credentials', 'true')
                    ->header('Access-Control-Max-Age', '86400');
            }

            return $next($request)
                ->header('Access-Control-Allow-Origin', $origin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
                ->header('Access-Control-Allow-Credentials', 'true');
        }

        return $next($request);
    }
}
