import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { clientService, infrastructureService, cableService, siteService } from '../services/services';
import { getColorByType } from '../utils/iconMapping';
import {
  Plus, X, Trash2, Pencil, Search, MapPin, Phone, Mail, User,
  Wifi, Cable, Building, Filter, UserCheck, UserX, Map, Crosshair
} from 'lucide-react';
import './ClientManager.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Create custom marker icon for location selection
const createSelectIcon = () => {
  const iconHtml = `<div style="
    width: 40px;
    height: 40px;
    background-color: #ef4444;
    border-radius: 50%;
    border: 4px solid white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.4);
    animation: pulse 1.5s infinite;
  "></div>
  <style>
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  </style>`;

  return L.divIcon({
    html: iconHtml,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: 'select-marker-icon',
  });
};

// Create infrastructure icon
const getIconSvg = (typeName) => {
  const typeLower = (typeName || '').toLowerCase();

  if (typeLower === 'site') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>`;
  }
  if (typeLower === 'odc') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M2 6h20"/><path d="M2 12h20"/><path d="M2 18h20"/><path d="M6 6v12"/><path d="M12 6v12"/><path d="M18 6v12"/></svg>`;
  }
  if (typeLower === 'odp') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`;
  }
  if (typeLower.includes('joint') || typeLower.includes('box')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 9h2"/><path d="M2 15h2"/></svg>`;
  }
  if (typeLower === 'tiang') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
};

const createInfraIcon = (infraType) => {
  const color = getColorByType(infraType);
  const svgIcon = getIconSvg(infraType);
  const size = 36;

  const iconHtml = `<div style="
    width: ${size}px;
    height: ${size}px;
    background-color: ${color};
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
  ">${svgIcon}</div>`;

  return L.divIcon({
    html: iconHtml,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    className: 'infra-marker-icon',
  });
};

// Component to handle map click
const LocationSelector = ({ position, onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? <Marker position={position} icon={createSelectIcon()} /> : null;
};

// Component to update map when center changes
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 16, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
};

// Map Picker Modal Component with Infrastructure
const MapPickerModal = ({ isOpen, onClose, onSelect, initialLat, initialLng }) => {
  const [infrastructures, setInfrastructures] = useState([]);
  const [sites, setSites] = useState([]);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapKey, setMapKey] = useState(0);

  const defaultCenter = initialLat && initialLng
    ? [parseFloat(initialLat), parseFloat(initialLng)]
    : [-7.581020, 110.770065];

  // Reset position when modal opens and force map re-render
  useEffect(() => {
    if (isOpen) {
      setPosition(initialLat && initialLng ? [parseFloat(initialLat), parseFloat(initialLng)] : null);
      loadMapData();
      // Force map to re-render by changing key
      setMapKey(prev => prev + 1);
    }
  }, [isOpen, initialLat, initialLng]);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const [infRes, siteRes] = await Promise.all([
        infrastructureService.getAllForMap(),
        siteService.getForMap()
      ]);
      setInfrastructures(infRes.data);
      setSites(siteRes.data);
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (lat, lng) => {
    setPosition([lat, lng]);
  };

  const handleConfirm = () => {
    if (position) {
      onSelect(position[0], position[1]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="map-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Pilih Lokasi Pelanggan</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="map-picker-instructions">
          <MapPin size={16} />
          <span>Klik pada peta untuk memilih lokasi. Titik infrastruktur sudah ditampilkan untuk membantu pencarian.</span>
        </div>
        <div className="map-picker-container">
          <MapContainer
            key={mapKey}
            center={defaultCenter}
            zoom={16}
            style={{ width: '100%', height: '500px' }}
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={18}
              maxZoom={19}
            />
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/Labels/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={18}
              maxZoom={19}
              opacity={0.7}
            />

            <MapUpdater center={position || defaultCenter} zoom={16} />

            {/* Site markers */}
            {sites.map((site) => {
              const lat = parseFloat(site.latitude);
              const lng = parseFloat(site.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;
              return (
                <Marker
                  key={`site-${site.id}`}
                  position={[lat, lng]}
                  icon={createInfraIcon('site')}
                >
                  <Popup>
                    <div className="infra-popup">
                      <strong>{site.name}</strong>
                      <br /><small>Site</small>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Infrastructure markers */}
            {infrastructures.map((infra) => {
              if (infra.type?.name === 'Kabel') return null;
              const lat = parseFloat(infra.latitude);
              const lng = parseFloat(infra.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;
              return (
                <Marker
                  key={`infra-${infra.id}`}
                  position={[lat, lng]}
                  icon={createInfraIcon(infra.type?.name)}
                >
                  <Popup>
                    <div className="infra-popup">
                      <strong>{infra.name}</strong>
                      <br /><small>{infra.type?.name}</small>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Selected location marker */}
            <LocationSelector position={position} onSelect={handleSelect} />
          </MapContainer>
        </div>

        {position && (
          <div className="map-picker-coords">
            <span><strong>Latitude:</strong> {position[0].toFixed(8)}</span>
            <span><strong>Longitude:</strong> {position[1].toFixed(8)}</span>
          </div>
        )}

        <div className="map-picker-legend">
          <span className="legend-item"><span className="legend-dot" style={{background: '#667eea'}}></span> Site</span>
          <span className="legend-item"><span className="legend-dot" style={{background: '#f59e0b'}}></span> ODC</span>
          <span className="legend-item"><span className="legend-dot" style={{background: '#22c55e'}}></span> ODP</span>
          <span className="legend-item"><span className="legend-dot" style={{background: '#ef4444'}}></span> Joint Box</span>
          <span className="legend-item"><span className="legend-dot" style={{background: '#6b7280'}}></span> Tiang</span>
          <span className="legend-item"><span className="legend-dot" style={{background: '#dc2626'}}></span> Lokasi</span>
        </div>

        <div className="map-picker-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!position}
          >
            <MapPin size={16} /> Konfirmasi Lokasi
          </button>
        </div>
      </div>
    </div>
  );
};

const ClientManager = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showConnect, setShowConnect] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sites, setSites] = useState([]);
  const [infrastructures, setInfrastructures] = useState([]);
  const [cables, setCables] = useState([]);
  const [statistics, setStatistics] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    latitude: '',
    longitude: '',
    package_type: '',
    monthly_fee: '',
    installation_date: '',
    status: 'pending',
    site_id: '',
    notes: ''
  });

  const [connectForm, setConnectForm] = useState({
    infrastructure_id: '',
    splitter_port_id: '',
    cable_id: '',
    core_number: '',
    cable_length_m: '',
    ont_serial: '',
    ont_model: '',
    ip_address: '',
    connection_type: 'odp',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsRes, sitesRes, infraRes, cablesRes, statsRes] = await Promise.all([
        clientService.getAll(),
        siteService.getAll(),
        infrastructureService.getAll(),
        cableService.getAll(),
        clientService.getStatistics(),
      ]);

      setClients(clientsRes.data);
      setSites(sitesRes.data);
      setInfrastructures(infraRes.data);
      setCables(cablesRes.data);
      setStatistics(statsRes.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
        site_id: formData.site_id || null,
      };

      if (editingClient) {
        await clientService.update(editingClient.id, data);
      } else {
        await clientService.create(data);
      }

      resetForm();
      loadData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      latitude: client.latitude || '',
      longitude: client.longitude || '',
      package_type: client.package_type || '',
      monthly_fee: client.monthly_fee || '',
      installation_date: client.installation_date || '',
      status: client.status || 'pending',
      site_id: client.site_id || '',
      notes: client.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus pelanggan ini?')) return;
    try {
      await clientService.delete(id);
      loadData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    try {
      await clientService.connect(showConnect.id, {
        ...connectForm,
        infrastructure_id: connectForm.infrastructure_id || null,
        splitter_port_id: connectForm.splitter_port_id || null,
        cable_id: connectForm.cable_id || null,
        core_number: connectForm.core_number ? parseInt(connectForm.core_number) : null,
        cable_length_m: connectForm.cable_length_m ? parseFloat(connectForm.cable_length_m) : null,
      });
      setShowConnect(null);
      setConnectForm({
        infrastructure_id: '',
        splitter_port_id: '',
        cable_id: '',
        core_number: '',
        cable_length_m: '',
        ont_serial: '',
        ont_model: '',
        ip_address: '',
        connection_type: 'odp',
        notes: ''
      });
      loadData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDisconnect = async (clientId, connectionId) => {
    if (!window.confirm('Lepas koneksi pelanggan ini?')) return;
    try {
      await clientService.disconnect(clientId, connectionId);
      loadData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleMapSelect = (lat, lng) => {
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString()
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingClient(null);
    setFormData({
      name: '', phone: '', email: '', address: '',
      latitude: '', longitude: '', package_type: '',
      monthly_fee: '', installation_date: '', status: 'pending',
      site_id: '', notes: ''
    });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: 'Semua' },
    { value: 'active', label: 'Aktif' },
    { value: 'pending', label: 'Pending' },
    { value: 'inactive', label: 'Nonaktif' },
    { value: 'suspended', label: 'Suspensi' },
  ];

  const packageTypes = ['10 Mbps', '20 Mbps', '30 Mbps', '50 Mbps', '100 Mbps', '200 Mbps', '500 Mbps'];

  const getStatusColor = (status) => {
    const colors = {
      active: '#22c55e',
      pending: '#f59e0b',
      inactive: '#6b7280',
      suspended: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getInfrastructuresByType = (type) => {
    return infrastructures.filter(i => {
      const name = i.type?.name?.toLowerCase() || '';
      if (type === 'odp') return name.includes('odp');
      if (type === 'joint_box') return name.includes('joint') || name.includes('jb');
      return false;
    });
  };

  if (loading) {
    return <div className="client-loading">Memuat data pelanggan...</div>;
  }

  return (
    <div className="client-manager">
      <div className="client-header">
        <div>
          <h2>Manajemen Pelanggan</h2>
          <p>Kelola data pelanggan dan koneksi ke infrastruktur</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Tambah Pelanggan
        </button>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total"><User size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{statistics.total || 0}</span>
            <span className="stat-label">Total Pelanggan</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active"><UserCheck size={20} /></div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: '#22c55e' }}>{statistics.active || 0}</span>
            <span className="stat-label">Aktif</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending"><UserX size={20} /></div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: '#f59e0b' }}>{statistics.pending || 0}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inactive"><Building size={20} /></div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: '#6b7280' }}>{statistics.inactive || 0}</span>
            <span className="stat-label">Nonaktif</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Cari nama, alamat, atau telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Client List */}
      <div className="client-list">
        {filteredClients.length === 0 ? (
          <div className="empty-state">
            <User size={48} />
            <p>Belum ada pelanggan</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Tambah Pelanggan Baru
            </button>
          </div>
        ) : (
          filteredClients.map(client => (
            <div key={client.id} className="client-card">
              <div className="client-main">
                <div className="client-avatar" style={{ backgroundColor: getStatusColor(client.status) }}>
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="client-info">
                  <div className="client-header-row">
                    <h3>{client.name}</h3>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(client.status) }}>
                      {client.status === 'active' ? 'Aktif' :
                       client.status === 'pending' ? 'Pending' :
                       client.status === 'inactive' ? 'Nonaktif' : 'Suspensi'}
                    </span>
                  </div>
                  {client.address && <p className="client-address"><MapPin size={12} /> {client.address}</p>}
                  <div className="client-details">
                    {client.phone && <span><Phone size={12} /> {client.phone}</span>}
                    {client.package_type && <span className="package-badge">{client.package_type}</span>}
                    {client.site && <span><Building size={12} /> {client.site.name}</span>}
                  </div>
                </div>
              </div>

              {/* Connection Info */}
              {client.connections && client.connections.length > 0 && (
                <div className="connection-info">
                  <div className="connection-badge">
                    <Cable size={14} />
                    <span>
                      {client.infrastructure_name || 'Terhubung'}
                      {client.connection_type && ` (${client.connection_type.toUpperCase()})`}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="client-actions">
                <button className="btn-icon" onClick={() => handleEdit(client)} title="Edit">
                  <Pencil size={14} />
                </button>
                <button className="btn-icon" onClick={() => setShowConnect(client)} title="Sambungkan">
                  <Wifi size={14} />
                </button>
                <button className="btn-icon btn-danger" onClick={() => handleDelete(client.id)} title="Hapus">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClient ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</h3>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>

            <form className="client-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nama Pelanggan *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Telepon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Paket Internet</label>
                  <select
                    value={formData.package_type}
                    onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                  >
                    <option value="">-- Pilih Paket --</option>
                    {packageTypes.map(pkg => (
                      <option key={pkg} value={pkg}>{pkg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Alamat</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Koordinat dengan tombol peta */}
              <div className="form-row coordinate-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <div className="coordinate-input-group">
                    <input
                      type="number"
                      step="0.00000001"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="-6.20880000"
                    />
                    <button
                      type="button"
                      className="btn btn-map-picker"
                      onClick={() => setShowMapPicker(true)}
                      title="Pilih di Peta"
                    >
                      <Map size={16} />
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <div className="coordinate-input-group">
                    <input
                      type="number"
                      step="0.00000001"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="106.84560000"
                    />
                    {formData.latitude && formData.longitude && (
                      <span className="coordinate-check">✓</span>
                    )}
                  </div>
                </div>
              </div>

              {formData.latitude && formData.longitude && (
                <div className="location-selected-info">
                  <MapPin size={14} />
                  <span>Lokasi sudah dipilih di peta</span>
                  <button
                    type="button"
                    className="btn-text"
                    onClick={() => setShowMapPicker(true)}
                  >
                    Ubah Lokasi
                  </button>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Biaya Bulanan (Rp)</label>
                  <input
                    type="number"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Tanggal Instalasi</label>
                  <input
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Site</label>
                  <select
                    value={formData.site_id}
                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                  >
                    <option value="">-- Pilih Site --</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                    <option value="suspended">Suspensi</option>
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  💾 Simpan
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelect={handleMapSelect}
        initialLat={formData.latitude}
        initialLng={formData.longitude}
      />

      {/* Connect Modal */}
      {showConnect && (
        <div className="modal-overlay" onClick={() => setShowConnect(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sambungkan ke Infrastruktur</h3>
              <button className="btn-close" onClick={() => setShowConnect(null)}>×</button>
            </div>

            <form className="connect-form" onSubmit={handleConnect}>
              <div className="client-connect-info">
                <User size={20} />
                <span>{showConnect.name}</span>
              </div>

              <div className="form-group">
                <label>Jenis Koneksi</label>
                <select
                  value={connectForm.connection_type}
                  onChange={(e) => setConnectForm({ ...connectForm, connection_type: e.target.value, infrastructure_id: '' })}
                >
                  <option value="odp">ODP (Optical Distribution Point)</option>
                  <option value="joint_box">Joint Box</option>
                  <option value="otb">OTB (Optical Termination Box)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Infrastruktur</label>
                <select
                  value={connectForm.infrastructure_id}
                  onChange={(e) => setConnectForm({ ...connectForm, infrastructure_id: e.target.value })}
                >
                  <option value="">-- Pilih Infrastruktur --</option>
                  {getInfrastructuresByType(connectForm.connection_type).map(infra => (
                    <option key={infra.id} value={infra.id}>
                      {infra.name} ({infra.type?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Kabel Drop</label>
                  <select
                    value={connectForm.cable_id}
                    onChange={(e) => setConnectForm({ ...connectForm, cable_id: e.target.value })}
                  >
                    <option value="">-- Pilih Kabel --</option>
                    {cables.map(cable => (
                      <option key={cable.id} value={cable.id}>
                        {cable.name} ({cable.core_count}C)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Core</label>
                  <input
                    type="number"
                    min="1"
                    value={connectForm.core_number}
                    onChange={(e) => setConnectForm({ ...connectForm, core_number: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Panjang Kabel (meter)</label>
                <input
                  type="number"
                  step="0.1"
                  value={connectForm.cable_length_m}
                  onChange={(e) => setConnectForm({ ...connectForm, cable_length_m: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Serial ONT</label>
                  <input
                    type="text"
                    value={connectForm.ont_serial}
                    onChange={(e) => setConnectForm({ ...connectForm, ont_serial: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Model ONT</label>
                  <input
                    type="text"
                    value={connectForm.ont_model}
                    onChange={(e) => setConnectForm({ ...connectForm, ont_model: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>IP Address</label>
                <input
                  type="text"
                  value={connectForm.ip_address}
                  onChange={(e) => setConnectForm({ ...connectForm, ip_address: e.target.value })}
                  placeholder="Contoh: 192.168.1.100"
                />
              </div>

              <div className="form-group">
                <label>Catatan</label>
                <textarea
                  value={connectForm.notes}
                  onChange={(e) => setConnectForm({ ...connectForm, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  🔗 Sambungkan
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowConnect(null)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;
