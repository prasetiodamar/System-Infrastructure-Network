<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('package_type', 50)->nullable(); // e.g., 10Mbps, 20Mbps, 50Mbps
            $table->decimal('monthly_fee', 12, 2)->nullable();
            $table->date('installation_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'pending', 'suspended'])->default('active');
            $table->foreignId('site_id')->nullable()->constrained()->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Client connections to infrastructure ports
        Schema::create('client_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->foreignId('infrastructure_id')->nullable()->constrained()->onDelete('set null'); // ODP or Joint Box
            $table->foreignId('splitter_port_id')->nullable()->constrained('splitter_ports')->onDelete('set null'); // ODP Splitter Port
            $table->foreignId('splice_id')->nullable()->constrained()->onDelete('set null'); // Joint Box Splice
            $table->foreignId('cable_id')->nullable()->constrained()->onDelete('set null'); // Drop cable
            $table->integer('core_number')->nullable(); // Core used in drop cable
            $table->decimal('cable_length_m', 8, 2)->nullable(); // Length of drop cable
            $table->string('ont_serial', 100)->nullable(); // ONT Serial Number
            $table->string('ont_model', 100)->nullable(); // ONT Model
            $table->string('ip_address', 45)->nullable(); // IPv4 or IPv6
            $enumType = ['odp', 'joint_box', 'otb', 'direct'];
            $table->enum('connection_type', $enumType)->default('odp');
            $table->date('connection_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_connections');
        Schema::dropIfExists('clients');
    }
};
