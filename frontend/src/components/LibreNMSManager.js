import React, { useState, useEffect } from 'react';
import { libreNMSService } from '../services/libreNMS';
import {
  Network, Server, Router, KeyboardMusic, HardDrive,
  RefreshCw, Search, AlertTriangle, CheckCircle, XCircle,
  Cpu, Activity, Wifi, Thermometer, Zap, Gauge,
  ArrowUp, ArrowDown, LayoutGrid, List, ExternalLink, Download
} from 'lucide-react';
import './LibreNMSManager.css';

const LibreNMSManager = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]); // For bulk mapping
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [devicePorts, setDevicePorts] = useState([]);
  const [deviceSensors, setDeviceSensors] = useState({});
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [activePortTab, setActivePortTab] = useState('ports');
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortOrder, setSortOrder] = useState('asc');
  const [deviceCategory, setDeviceCategory] = useState({}); // { device_id: 'router'|'switch'|'server'|'olt' }
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadDevices();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await libreNMSService.getCategories();
      setDeviceCategory(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const saveCategory = async (deviceId, category) => {
    try {
      await libreNMSService.updateCategory(deviceId, category || null);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const exportCSV = () => {
    const headers = ['Hostname', 'IP', 'Type', 'OS', 'Status', 'Category', 'Uptime', 'Location'];
    const rows = filteredDevices.map(d => [
      d.hostname,
      d.ip,
      d.type || '',
      d.os || '',
      d.status === 1 ? 'Online' : 'Offline',
      deviceCategory[String(d.device_id)] || 'Unmapped',
      formatUptime(d.uptime),
      d.location || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `librenms-devices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };


  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await libreNMSService.getDevices();
      console.log('LibreNMS full response:', JSON.stringify(response.data));
      const data = response.data;

      // LibreNMS v0 format: { status: "ok", devices: [...] }
      let devices = [];
      if (data.status === 'ok' && Array.isArray(data.devices)) {
        devices = data.devices;
      } else if (Array.isArray(data)) {
        devices = data;
      } else if (data.devices) {
        devices = data.devices;
      }

      console.log('Found devices:', devices);

      if (devices.length > 0) {
        setDevices(devices);
      } else {
        setError('No devices found in LibreNMS. Please add devices in LibreNMS first.');
      }
    } catch (err) {
      console.error('Error loading LibreNMS devices:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to connect to LibreNMS';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const importLocations = async () => {
    if (!window.confirm('Import locations from LibreNMS as Sites? This will add new sites based on device locations.')) {
      return;
    }
    setImporting(true);
    try {
      const response = await fetch('/api/librenms/import-locations');
      const data = await response.json();
      if (response.ok && data.success) {
        alert(data.message);
        // Optionally reload sites
      } else {
        alert('Error: ' + (data.error || data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error importing locations:', err);
      alert('Failed to import locations: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const loadDevicePorts = async (hostname) => {
    setLoadingPorts(true);
    setDeviceSensors({});
    try {
      console.log('Loading ports for hostname:', hostname);
      const response = await libreNMSService.getDevicePorts(hostname);
      console.log('Ports response:', response.data);
      console.log('Ports array:', JSON.stringify(response.data.ports).substring(0, 500));
      // LibreNMS v0 format: { status: "ok", ports: [...] }
      if (response.data && response.data.status === 'ok' && response.data.ports) {
        setDevicePorts(response.data.ports);
      } else {
        setDevicePorts([]);
      }

      // Also load sensors (transceiver DDM data)
      try {
        const sensorsResponse = await libreNMSService.getDeviceSensors(hostname);
        console.log('Sensors response:', sensorsResponse.data);
        // Check for valid response (not server error)
        if (sensorsResponse.data &&
            sensorsResponse.data.status === 'ok' &&
            sensorsResponse.data.sensors &&
            Array.isArray(sensorsResponse.data.sensors) &&
            sensorsResponse.data.sensors.length > 0) {
          // Group sensors by port name
          const sensorMap = {};
          sensorsResponse.data.sensors.forEach(sensor => {
            // Extract port name from sensor name (e.g., "sfp-sfpplus1_NEXUS Tx" -> "sfp-sfpplus1_NEXUS")
            const match = sensor.sensor_descr?.match(/^(.+?)\s+(Tx|Rx|Tx Bias|Temperature|Voltage|Bias)$/);
            const portName = match ? match[1] : sensor.sensor_descr;
            if (!sensorMap[portName]) {
              sensorMap[portName] = {};
            }
            sensorMap[portName][sensor.sensor_type] = sensor;
          });
          setDeviceSensors(sensorMap);
        }
      } catch (sensorErr) {
        console.error('Error loading sensors:', sensorErr);
        // Sensors not available - this is okay, just don't show them
      }
    } catch (err) {
      console.error('Error loading ports:', err);
      setDevicePorts([]);
    } finally {
      setLoadingPorts(false);
    }
  };

  const getDeviceIcon = (device) => {
    const typeLower = (device.type || '').toLowerCase();
    const osLower = (device.os || '').toLowerCase();

    // Switch detection (check first to avoid router conflict)
    if (osLower === 'ios' || osLower === 'nxos' || osLower === 'comware' || osLower === 'vrp' || osLower === 'junos' || osLower.includes('switch')) {
      return <KeyboardMusic size={20} />;
    }
    // Router detection
    if (typeLower === 'network' || osLower.includes('router') || osLower.includes('mikrotik')) {
      return <Router size={20} />;
    }
    // Server detection
    if (typeLower === 'server' || osLower === 'linux' || osLower === 'proxmox' || osLower === 'vmware-esxi' || osLower === 'dsm' || osLower === 'apc') {
      return <Server size={20} />;
    }
    // OLT detection
    if (osLower.includes('olt') || osLower === 'zxa10' || osLower.includes('fiberhome') || osLower.includes('huawei')) {
      return <HardDrive size={20} />;
    }
    return <Network size={20} />;
  };

  const getDeviceColor = (device) => {
    const typeLower = (device.type || '').toLowerCase();
    const osLower = (device.os || '').toLowerCase();
    const hardwareLower = (device.hardware || '').toLowerCase();

    if (typeLower === 'network' || osLower.includes('router') || osLower.includes('mikrotik') || osLower.includes('cisco')) {
      return '#009688'; // Router - teal
    }
    if (osLower.includes('switch') || hardwareLower.includes('switch')) {
      return '#FF5722'; // Switch - orange
    }
    if (typeLower === 'server' || osLower.includes('linux') || osLower.includes('windows') || osLower.includes('proxmox')) {
      return '#3F51B5'; // Server - indigo
    }
    if (osLower.includes('olt') || osLower.includes('zxa10') || osLower.includes('fiberhome') || osLower.includes('huawei')) {
      return '#00BCD4'; // OLT - cyan
    }
    return '#795548'; // Default - brown
  };

  const getStatusIcon = (status) => {
    if (status === 1) return <CheckCircle size={16} className="status-online" />;
    return <XCircle size={16} className="status-offline" />;
  };

  const formatUptime = (uptime) => {
    if (!uptime) return '-';
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDeviceDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffMonths / 12);

    if (diffYears > 0) return `${diffYears} year ${diffMonths % 12} month`;
    if (diffMonths > 0) return `${diffMonths} month ${diffDays % 30} day`;
    if (diffDays > 0) return `${diffDays} day ${diffHours % 24} hour`;
    if (diffHours > 0) return `${diffHours} hour ${diffMins % 60} min`;
    if (diffMins > 0) return `${diffMins} min ${diffSecs % 60} sec`;
    return `${diffSecs} sec`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPortSpeed = (ifSpeed) => {
    if (!ifSpeed) return '-';
    const speed = parseInt(ifSpeed);
    if (speed >= 1000000000) return (speed / 1000000000) + ' Gbps';
    if (speed >= 1000000) return (speed / 1000000) + ' Mbps';
    return (speed / 1000) + ' Kbps';
  };

  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    loadDevicePorts(device.hostname);
  };

  // Filter devices by search and category
  const filteredDevices = devices.filter(device => {
    // Handle quick filters
    if (searchQuery === 'status:down') {
      return device.status !== 1;
    }
    if (searchQuery === 'status:up') {
      return device.status === 1;
    }

    const query = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' ||
      device.hostname?.toLowerCase().includes(query) ||
      device.ip?.toLowerCase().includes(query) ||
      device.sysName?.toLowerCase().includes(query) ||
      device.type?.toLowerCase().includes(query) ||
      device.os?.toLowerCase().includes(query) ||
      device.hardware?.toLowerCase().includes(query) ||
      device.location?.toLowerCase().includes(query) ||
      device.sysContact?.toLowerCase().includes(query) ||
      (deviceCategory[String(device.device_id)] || '').toLowerCase().includes(query);

    // Filter by manually mapped category
    const deviceCat = deviceCategory[String(device.device_id)];
    const matchesCategory = activeTab === 'all' || deviceCat === activeTab;

    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    const nameA = (a.hostname || '').toLowerCase();
    const nameB = (b.hostname || '').toLowerCase();
    if (sortOrder === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  // Filter devices based on active category and site for stats
  const getFilteredDevices = () => {
    let filtered = devices;

    // Filter by category
    if (activeTab !== 'all') {
      filtered = filtered.filter(d => deviceCategory[String(d.device_id)] === activeTab);
    }

    return filtered;
  };

  const filteredForStats = getFilteredDevices();

  // Count devices by status (based on active category)
  const deviceStats = {
    total: filteredForStats.length,
    online: filteredForStats.filter(d => d.status === 1).length,
    offline: filteredForStats.filter(d => d.status !== 1).length,
    router: Object.values(deviceCategory).filter(c => c === 'router').length,
    switch: Object.values(deviceCategory).filter(c => c === 'switch').length,
    server: Object.values(deviceCategory).filter(c => c === 'server').length,
    olt: Object.values(deviceCategory).filter(c => c === 'olt').length,
  };

  if (loading) {
    return (
      <div className="librenms-manager">
        <div className="loading">
          <RefreshCw size={24} className="spin" /> Loading devices from LibreNMS...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="librenms-manager">
        <div className="error-state">
          <AlertTriangle size={48} />
          <h3>Connection Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadDevices}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="librenms-manager">
      <div className="manager-header">
        <h2><Activity size={24} className="header-icon" /> LibreNMS Devices</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={importLocations} disabled={importing}>
            <RefreshCw size={16} className={importing ? 'spin' : ''} /> {importing ? 'Importing...' : 'Import Sites'}
          </button>
          <button className="btn btn-secondary" onClick={loadDevices}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="librenms-stats">
        <div className="stat-card">
          <div className="stat-icon"><Network size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{deviceStats.total}</div>
            <div className="stat-label">Total Devices</div>
          </div>
        </div>
        <div className="stat-card online">
          <div className="stat-icon"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{deviceStats.online}</div>
            <div className="stat-label">Online</div>
          </div>
        </div>
        <div className="stat-card offline">
          <div className="stat-icon"><XCircle size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{deviceStats.offline}</div>
            <div className="stat-label">Offline</div>
          </div>
        </div>
      </div>

      {/* Dashboard Overview - Category Breakdown */}
      {Object.keys(deviceCategory).length > 0 && (
        <div className="dashboard-overview" style={{ marginBottom: '16px', padding: '16px', background: 'white', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Category Overview</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { key: 'router', label: 'Router', icon: Router, color: '#009688' },
              { key: 'switch', label: 'Switch', icon: KeyboardMusic, color: '#FF5722' },
              { key: 'server', label: 'Server', icon: Server, color: '#3F51B5' },
              { key: 'olt', label: 'OLT', icon: HardDrive, color: '#00BCD4' },
            ].map(cat => {
              const count = Object.values(deviceCategory).filter(c => c === cat.key).length;
              const percent = devices.length > 0 ? Math.round((count / devices.length) * 100) : 0;
              return (
                <div key={cat.key} style={{ flex: '1 1 120px', minWidth: '100px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <cat.icon size={14} style={{ color: cat.color }} />
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>{cat.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginLeft: 'auto' }}>{count}</span>
                  </div>
                  <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percent}%`, background: cat.color, borderRadius: '3px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
            <span>Total Mapped: {Object.keys(deviceCategory).length}</span>
            <span>Unmapped: {devices.length - Object.keys(deviceCategory).length}</span>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="librenms-tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`tab ${activeTab === 'router' ? 'active' : ''}`}
          onClick={() => setActiveTab('router')}
        >
          <Router size={14} /> Router
        </button>
        <button
          className={`tab ${activeTab === 'switch' ? 'active' : ''}`}
          onClick={() => setActiveTab('switch')}
        >
          <KeyboardMusic size={14} /> Switch
        </button>
        <button
          className={`tab ${activeTab === 'server' ? 'active' : ''}`}
          onClick={() => setActiveTab('server')}
        >
          <Server size={14} /> Server
        </button>
        <button
          className={`tab ${activeTab === 'olt' ? 'active' : ''}`}
          onClick={() => setActiveTab('olt')}
        >
          <HardDrive size={14} /> OLT
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedDevices.length > 0 && (
        <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #fcd34d' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#92400e' }}>
            {selectedDevices.length} device(s) selected
          </span>
          <button
            className="btn"
            style={{ padding: '6px 12px', fontSize: '11px', background: '#3b82f6', color: 'white' }}
            onClick={() => setSelectedDevices(filteredDevices.map(d => String(d.device_id)))}
          >
            Select All
          </button>
          <button
            className="btn"
            style={{ padding: '6px 12px', fontSize: '11px', background: '#22c55e', color: 'white', cursor: 'pointer', border: 'none', borderRadius: '4px', zIndex: 100, position: 'relative' }}
            onClick={() => {
              console.log('Clicked Assign Category, selectedDevices:', selectedDevices);
              setShowBulkModal(true);
            }}
          >
            Assign Category
          </button>
          <button
            className="btn"
            style={{ padding: '6px 12px', fontSize: '11px', background: '#6b7280', color: 'white' }}
            onClick={() => setSelectedDevices([])}
          >
            Clear
          </button>
        </div>
      )}

      {/* Quick Filters */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: '#6b7280', alignSelf: 'center' }}>Quick:</span>
        <button
          onClick={() => setSearchQuery('status:down')}
          style={{ padding: '4px 8px', fontSize: '10px', border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '4px', color: '#dc2626', cursor: 'pointer' }}
        >
          ↓ Offline
        </button>
        <button
          onClick={() => setSearchQuery('status:up')}
          style={{ padding: '4px 8px', fontSize: '10px', border: '1px solid #d1fae5', background: '#f0fdf4', borderRadius: '4px', color: '#16a34a', cursor: 'pointer' }}
        >
          ↑ Online
        </button>
        <button
          onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
          style={{ padding: '4px 8px', fontSize: '10px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '4px', color: '#6b7280', cursor: 'pointer' }}
        >
          Show All
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by hostname, IP, location, OS, hardware..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className={`btn-sort ${sortOrder ? 'active' : ''}`}
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          title={sortOrder === 'asc' ? 'Sort A-Z' : 'Sort Z-A'}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 10px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500', color: sortOrder === 'asc' ? 'white' : '#6b7280', transition: 'all 0.15s' }}
        >
          {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </button>
        <button
          className={`btn-view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid #e5e7eb', background: viewMode === 'grid' ? '#22c55e' : 'white', borderRadius: '6px', cursor: 'pointer', color: viewMode === 'grid' ? 'white' : '#6b7280', transition: 'all 0.15s' }}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          className={`btn-view-toggle ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid #e5e7eb', background: viewMode === 'list' ? '#22c55e' : 'white', borderRadius: '6px', cursor: 'pointer', color: viewMode === 'list' ? 'white' : '#6b7280', transition: 'all 0.15s' }}
        >
          <List size={16} />
        </button>
        <span style={{ fontSize: '11px', color: '#6b7280', paddingLeft: '4px' }}>
          {filteredDevices.length} Device{filteredDevices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Devices Grid/List */}
      {filteredDevices.length === 0 ? (
        <div className="empty-state">
          <Network size={48} />
          <h3>No devices found</h3>
          <p>Try adjusting your search or filter.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="devices-list">
          {filteredDevices.map(device => (
            <div
              key={device.device_id}
              className="device-list-item"
              onClick={() => handleDeviceClick(device)}
            >
              <input
                type="checkbox"
                checked={selectedDevices.includes(String(device.device_id))}
                onChange={(e) => {
                  e.stopPropagation();
                  const devId = String(device.device_id);
                  if (e.target.checked) {
                    setSelectedDevices([...selectedDevices, devId]);
                  } else {
                    setSelectedDevices(selectedDevices.filter(id => id !== devId));
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div className="device-icon" style={{ color: getDeviceColor(device) }}>
                {getDeviceIcon(device)}
              </div>
              <div className="device-list-info">
                <h3>{device.hostname}</h3>
                <span>{device.sysName && device.sysName !== device.hostname ? `${device.sysName} • ` : ''}{device.ip} • {device.hardware || device.type}</span>
              </div>
              <div className="device-status">
                {getStatusIcon(device.status)}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={12} /> {formatUptime(device.uptime)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="devices-grid">
          {filteredDevices.map(device => (
            <div
              key={device.device_id}
              className="device-card"
              onClick={() => handleDeviceClick(device)}
              style={{ borderLeftColor: getDeviceColor(device) }}
            >
              <div className="device-header">
                <div className="device-icon" style={{ color: getDeviceColor(device) }}>
                  {getDeviceIcon(device)}
                </div>
                <div className="device-status">
                  {getStatusIcon(device.status)}
                </div>
              </div>
              <div className="device-info">
                <h3>{device.hostname}</h3>
                {device.sysName && device.sysName !== device.hostname && (
                  <p className="device-sysname">{device.sysName}</p>
                )}
                <p className="device-ip">{device.ip}</p>
                <p className="device-type">{device.hardware || device.type}</p>
              </div>
              <div className="device-meta">
                <span><Activity size={12} /> {formatUptime(device.uptime)}</span>
                <span><Cpu size={12} /> {device.os}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Device Detail Modal */}
      {selectedDevice && (
        <div className="modal-overlay" onClick={() => setSelectedDevice(null)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedDevice(null)}>×</button>

            <div className="device-detail-header">
              <div className="device-icon-large" style={{ color: getDeviceColor(selectedDevice) }}>
                {getDeviceIcon(selectedDevice)}
              </div>
              <div style={{ flex: 1 }}>
                <h2>{selectedDevice.hostname}</h2>
                <p>{selectedDevice.ip} • {selectedDevice.type}</p>
                <div className="device-detail-status">
                  {getStatusIcon(selectedDevice.status)}
                  <span>{selectedDevice.status === 1 ? 'Online' : 'Offline'}</span>
                  <span>•</span>
                  <span>Uptime: {formatUptime(selectedDevice.uptime)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Category</label>
                <select
                  value={deviceCategory[String(selectedDevice.device_id)] || ''}
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    setDeviceCategory({
                      ...deviceCategory,
                      [String(selectedDevice.device_id)]: newCategory
                    });
                    saveCategory(selectedDevice.device_id, newCategory);
                  }}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: 'white',
                    minWidth: '100px'
                  }}
                >
                  <option value="">Unmapped</option>
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="server">Server</option>
                  <option value="olt">OLT</option>
                </select>
              </div>
            </div>

            <div className="device-detail-info">
              <div className="info-row">
                <span className="label">System Name:</span>
                <span className="value">{selectedDevice.sysName || selectedDevice.hostname}</span>
              </div>
              <div className="info-row">
                <span className="label">Resolved IP:</span>
                <span className="value">{selectedDevice.ip}</span>
              </div>
              <div className="info-row">
                <span className="label">Hardware:</span>
                <span className="value">{selectedDevice.hardware || '-'}</span>
              </div>
              <div className="info-row">
                <span className="label">Operating System:</span>
                <span className="value">{selectedDevice.os} {selectedDevice.os_version}</span>
              </div>
              <div className="info-row">
                <span className="label">Object ID:</span>
                <span className="value">{selectedDevice.sysObjectID || '-'}</span>
              </div>
              <div className="info-row">
                <span className="label">Contact:</span>
                <span className="value">{selectedDevice.sysContact || '-'}</span>
              </div>
              <div className="info-row">
                <span className="label">Device Added:</span>
                <span className="value">{selectedDevice.inserted ? formatDeviceDate(selectedDevice.inserted) : '-'}</span>
              </div>
              <div className="info-row">
                <span className="label">Last Discovered:</span>
                <span className="value">{selectedDevice.last_discovered ? formatDeviceDate(selectedDevice.last_discovered) : (selectedDevice.last_checked ? new Date(selectedDevice.last_checked * 1000).toLocaleString() : '-')}</span>
              </div>
              <div className="info-row">
                <span className="label">Uptime:</span>
                <span className="value">{formatUptime(selectedDevice.uptime)}</span>
              </div>
              <div className="info-row">
                <span className="label">Location:</span>
                <span className="value">{selectedDevice.location || '-'}</span>
              </div>
              <div className="info-row">
                <span className="label">Lat / Lng:</span>
                <span className="value">
                  {selectedDevice.latitude && selectedDevice.longitude
                    ? `${selectedDevice.latitude}, ${selectedDevice.longitude}`
                    : '-'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <a
                href={`https://librenms.gsmnet.co.id/device/${selectedDevice.device_id}/ports/transceivers`}
                target="_blank"
                rel="noopener noreferrer"
                className="librenms-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '6px' }}
              >
                <ExternalLink size={14} /> View in LibreNMS
              </a>
            </div>

            {/* Tabs for Ports and Transceivers */}
            <div className="port-tabs">
              <button
                className={`port-tab ${activePortTab === 'ports' ? 'active' : ''}`}
                onClick={() => setActivePortTab('ports')}
              >
                <Network size={14} /> Ports ({devicePorts.length})
              </button>
              <button
                className={`port-tab ${activePortTab === 'transceivers' ? 'active' : ''}`}
                onClick={() => setActivePortTab('transceivers')}
              >
                <Activity size={14} /> Transceivers ({Object.keys(deviceSensors).length})
              </button>
            </div>

            {loadingPorts ? (
              <div className="loading-ports">Loading...</div>
            ) : activePortTab === 'ports' ? (
              devicePorts.length === 0 ? (
                <div className="loading-ports">No ports available</div>
              ) : (
                <div className="ports-table" style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Port</th>
                        <th>Description</th>
                        <th>Admin</th>
                        <th>Status</th>
                        <th>Speed</th>
                        <th>VLAN</th>
                        <th>Traffic In</th>
                        <th>Traffic Out</th>
                        <th>Total In</th>
                        <th>Total Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devicePorts.map((port, idx) => (
                        <tr key={port.ifName || idx}>
                          <td style={{ fontWeight: '500' }}>{port.ifName || '-'}</td>
                          <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={port.ifDescr || port.ifAlias}>
                            {port.ifDescr || port.ifAlias || '-'}
                          </td>
                          <td>
                            {port.ifAdminStatus === 'up' ?
                              <span style={{ color: '#16a34a' }}>Up</span> :
                              <span style={{ color: '#dc2626' }}>Down</span>
                            }
                          </td>
                          <td>
                            {port.ifOperStatus === 'up' ?
                              <span className="port-up">Up</span> :
                              <span className="port-down">Down</span>
                            }
                          </td>
                          <td>{getPortSpeed(port.ifSpeed)}</td>
                          <td>{port.ifVlan || '-'}</td>
                          <td style={{ color: '#22c55e' }}>{port.ifInOctets_rate ? formatBytes(port.ifInOctets_rate) + '/s' : '-'}</td>
                          <td style={{ color: '#3b82f6' }}>{port.ifOutOctets_rate ? formatBytes(port.ifOutOctets_rate) + '/s' : '-'}</td>
                          <td style={{ color: '#6b7280' }}>{port.ifInOctets ? formatBytes(port.ifInOctets) : '-'}</td>
                          <td style={{ color: '#6b7280' }}>{port.ifOutOctets ? formatBytes(port.ifOutOctets) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Transceivers Tab
              Object.keys(deviceSensors).length === 0 ? (
                <div className="loading-ports">No transceivers detected on this device</div>
              ) : (
                <div className="transceivers-grid">
                  {Object.entries(deviceSensors).map(([portName, sensors]) => (
                    <div key={portName} className="transceiver-card">
                      <div className="transceiver-header">
                        <HardDrive size={16} />
                        <span className="transceiver-name">{portName}</span>
                      </div>
                      <div className="transceiver-sensors">
                        {sensors.dbm?.sensor_current && (
                          <div className="sensor-row">
                            <Zap size={14} className="sensor-icon" />
                            <span className="sensor-label">Tx Power:</span>
                            <span className="sensor-value">{sensors.dbm.sensor_current} dBm</span>
                          </div>
                        )}
                        {sensors.dbm_rx?.sensor_current && (
                          <div className="sensor-row">
                            <Wifi size={14} className="sensor-icon" />
                            <span className="sensor-label">Rx Power:</span>
                            <span className="sensor-value">{sensors.dbm_rx.sensor_current} dBm</span>
                          </div>
                        )}
                        {sensors.current?.sensor_current && (
                          <div className="sensor-row">
                            <Activity size={14} className="sensor-icon" />
                            <span className="sensor-label">Tx Bias:</span>
                            <span className="sensor-value">{sensors.current.sensor_current} mA</span>
                          </div>
                        )}
                        {sensors.temperature?.sensor_current && (
                          <div className="sensor-row">
                            <Thermometer size={14} className="sensor-icon" />
                            <span className="sensor-label">Temperature:</span>
                            <span className="sensor-value">{sensors.temperature.sensor_current} °C</span>
                          </div>
                        )}
                        {sensors.voltage?.sensor_current && (
                          <div className="sensor-row">
                            <Gauge size={14} className="sensor-icon" />
                            <span className="sensor-label">Voltage:</span>
                            <span className="sensor-value">{sensors.voltage.sensor_current} V</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Bulk Category Assignment Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Assign Category to {selectedDevices.length} Devices</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {[
                { key: 'router', label: 'Router', icon: Router, color: '#009688' },
                { key: 'switch', label: 'Switch', icon: KeyboardMusic, color: '#FF5722' },
                { key: 'server', label: 'Server', icon: Server, color: '#3F51B5' },
                { key: 'olt', label: 'OLT', icon: HardDrive, color: '#00BCD4' },
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={async () => {
                    try {
                      const categories = selectedDevices.map(deviceId => ({
                        device_id: Number(deviceId),
                        category: cat.key
                      }));
                      await libreNMSService.bulkUpdateCategories(categories);

                      // Update local state
                      const newCategory = { ...deviceCategory };
                      selectedDevices.forEach(id => {
                        newCategory[id] = cat.key;
                      });
                      setDeviceCategory(newCategory);
                      setSelectedDevices([]);
                      setShowBulkModal(false);
                    } catch (error) {
                      console.error('Error bulk updating:', error);
                      alert('Failed to update categories');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <cat.icon size={20} style={{ color: cat.color }} />
                  <span style={{ fontWeight: '500' }}>{cat.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowBulkModal(false)}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibreNMSManager;
