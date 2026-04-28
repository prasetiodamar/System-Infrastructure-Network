import React, { useState, useEffect } from 'react';
import { rackService, infrastructureService, infrastructureTypeService, siteService } from '../services/services';
import { libreNMSService } from '../services/libreNMS';
import { Server, Plus, Pencil, Trash2, Blinds, Eye, MapPin, Container, MemoryStick, GalleryThumbnails, Router, KeyboardMusic, Search, Upload, Image, Network, X, Edit, CircleCheckBig, CircleX, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, List, LayoutGrid } from 'lucide-react';
import './RackManager.css';

const getSiteTypeIcon = (type) => {
  if (type === 'datacenter') return <Container size={14} />;
  if (type === 'pop') return <MapPin size={14} />;
  return <MapPin size={14} />;
};

const RackManager = () => {
  const [racks, setRacks] = useState([]);
  const [types, setTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [hasDevice, setHasDevice] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid');
  const [uploadingImage, setUploadingImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(null);
  const [nmsDevices, setNmsDevices] = useState([]);
  const [loadingNmsDevices, setLoadingNmsDevices] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [nmsDeviceSearch, setNmsDeviceSearch] = useState('');
  const [editingNmsPosition, setEditingNmsPosition] = useState(false);
  const [viewingNmsDevice, setViewingNmsDevice] = useState(null);
  const [loadingNmsDeviceDetail, setLoadingNmsDeviceDetail] = useState(false);
  const [nmsDeviceDetail, setNmsDeviceDetail] = useState(null);
  const [nmsAutoRefresh, setNmsAutoRefresh] = useState(false);
  const [nmsLastUpdated, setNmsLastUpdated] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Load NMS devices when a rack with NMS device is selected
  useEffect(() => {
    if (selectedRack && (selectedRack.librenms_device_id || selectedRack.librenms_hostname)) {
      if (nmsDevices.length === 0) {
        loadNmsDevices();
      }
    }
  }, [selectedRack]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [racksRes, typesRes, sitesRes] = await Promise.all([
        rackService.getAll(),
        infrastructureTypeService.getAll(),
        siteService.getAll(), // Get POP and Data Center sites
      ]);

      console.log('Sites loaded:', sitesRes.data);
      setRacks(racksRes.data);
      setTypes(typesRes.data);
      setSites(sitesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNmsDevices = async () => {
    setLoadingNmsDevices(true);
    try {
      const response = await libreNMSService.getDevices();
      const data = response.data;
      if (data.status === 'ok' && Array.isArray(data.devices)) {
        setNmsDevices(data.devices);
      }
    } catch (error) {
      console.error('Error loading NMS devices:', error);
    } finally {
      setLoadingNmsDevices(false);
    }
  };

  const assignDeviceToRack = async (device, uPosition = '1') => {
    try {
      const rackId = selectedRack.id;

      // Parse U position - could be "1" or "1-2"
      let uPos = 1;
      let uHeight = 1;
      if (uPosition.includes('-')) {
        const [start, end] = uPosition.split('-').map(Number);
        uPos = start;
        uHeight = end - start + 1;
      } else {
        uPos = parseInt(uPosition);
        uHeight = 1;
      }

      await infrastructureService.update(rackId, {
        librenms_device_id: device.device_id,
        librenms_hostname: device.hostname,
        librenms_device_u_position: uPos,
        librenms_device_u_height: uHeight,
      });
      // Refresh the rack data
      loadData();
      setShowAssignModal(false);
      // Update selectedRack to reflect changes
      const updatedRack = racks.find(r => r.id === rackId);
      if (updatedRack) {
        setSelectedRack({
          ...updatedRack,
          librenms_device_id: device.device_id,
          librenms_hostname: device.hostname,
          librenms_device_u_position: uPos,
          librenms_device_u_height: uHeight
        });
      }
    } catch (error) {
      console.error('Error assigning device:', error);
    }
  };

  const removeDeviceFromRack = async () => {
    try {
      const rackId = selectedRack.id;
      await infrastructureService.update(rackId, {
        librenms_device_id: null,
        librenms_hostname: null,
        librenms_device_u_position: null,
        librenms_device_u_height: 1,
      });
      loadData();
      const updatedRack = racks.find(r => r.id === rackId);
      if (updatedRack) {
        setSelectedRack({...updatedRack, librenms_device_id: null, librenms_hostname: null, librenms_device_u_position: null});
      }
    } catch (error) {
      console.error('Error removing device:', error);
    }
  };

  const viewNmsDeviceDetails = async (hostname) => {
    setViewingNmsDevice(hostname);
    setLoadingNmsDeviceDetail(true);
    setNmsDeviceDetail(null);
    try {
      // Get all devices and find the one matching hostname
      const [devicesRes, portsRes] = await Promise.all([
        libreNMSService.getDevices(),
        libreNMSService.getDevicePorts(hostname)
      ]);

      const devicesData = devicesRes.data;
      const portsData = portsRes.data;

      // Find the specific device from the devices list
      const device = devicesData.devices?.find(d => d.hostname === hostname);

      if (device) {
        setNmsDeviceDetail({
          device: device,
          ports: portsData.status === 'ok' ? (portsData.ports || []) : []
        });
        setNmsLastUpdated(new Date());
      } else {
        console.error('Device not found:', hostname);
        setNmsDeviceDetail(null);
      }
    } catch (error) {
      console.error('Error fetching NMS device details:', error);
      setNmsDeviceDetail(null);
    } finally {
      setLoadingNmsDeviceDetail(false);
    }
  };

  const refreshNmsDeviceDetails = async () => {
    if (viewingNmsDevice) {
      await viewNmsDeviceDetails(viewingNmsDevice);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    let interval;
    if (nmsAutoRefresh && viewingNmsDevice) {
      interval = setInterval(() => {
        refreshNmsDeviceDetails();
      }, 10000); // Refresh every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [nmsAutoRefresh, viewingNmsDevice]);

  const updateNmsDevicePosition = async (uPosition) => {
    try {
      const rackId = selectedRack.id;
      let uPos = 1;
      let uHeight = 1;
      if (uPosition.includes('-')) {
        const [start, end] = uPosition.split('-').map(Number);
        uPos = start;
        uHeight = end - start + 1;
      } else {
        uPos = parseInt(uPosition);
        uHeight = 1;
      }

      await infrastructureService.update(rackId, {
        librenms_device_u_position: uPos,
        librenms_device_u_height: uHeight,
      });
      // Reload and then update selectedRack
      await loadData();
      // Find the updated rack from the reloaded data
      const updatedRack = racks.find(r => r.id === rackId);
      if (updatedRack) {
        setSelectedRack({
          ...updatedRack,
          librenms_device_id: updatedRack.librenms_device_id,
          librenms_hostname: updatedRack.librenms_hostname,
          librenms_device_u_position: uPos,
          librenms_device_u_height: uHeight
        });
      }
      setEditingNmsPosition(false);
    } catch (error) {
      console.error('Error updating NMS device position:', error);
    }
  };

  const handleCreateRack = async (rackData) => {
    try {
      console.log('Creating rack with data:', rackData);
      await infrastructureService.create(rackData);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating rack:', error);
      console.error('Response data:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to create rack');
    }
  };

  const handleDeleteRack = async (rackId) => {
    if (!window.confirm('Are you sure you want to delete this rack?')) return;

    try {
      await infrastructureService.delete(rackId);
      loadData();
    } catch (error) {
      console.error('Error deleting rack:', error);
      alert(error.response?.data?.message || 'Failed to delete rack');
    }
  };

  const handleImageUpload = async (rackId, e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(rackId);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images[]', files[i]);
    }

    try {
      await infrastructureService.uploadImage(rackId, formData);
      // Refresh to get updated data from server
      loadData();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (rackId, index) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await infrastructureService.deleteImage(rackId, index);
      setRacks(racks.map(rack =>
        rack.id === rackId
          ? { ...rack, images: rack.images.filter((_, i) => i !== index) }
          : rack
      ));
      loadData();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const handleImageDownload = async (rackId, index) => {
    try {
      const rack = racks.find(r => r.id === rackId);
      const imageName = rack?.images?.[index]?.name || 'image';
      const response = await infrastructureService.downloadImage(rackId, index);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = imageName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Gagal mendownload gambar');
    }
  };

  const getRackTypeLabel = (type) => {
    const labels = {
      'floor_standing': 'Rack Floor Standing',
      'wall_mount': 'Rack Wallmount',
      'open_frame': 'Rack Open Frame',
      'outdoor': 'Rack Outdoor',
    };
    return labels[type] || type;
  };

  // Filter racks based on search and site selection
  const filteredRacks = racks.filter(rack => {
    // Filter by site
    if (selectedSite && rack.site_id !== parseInt(selectedSite)) {
      return false;
    }

    // Filter by type
    if (selectedType && rack.rack_type !== selectedType) {
      return false;
    }

    // Filter by device presence
    const deviceCount = (rack.rack_devices_count || 0) + (rack.librenms_device_id || rack.librenms_hostname ? 1 : 0);
    if (hasDevice === 'yes' && deviceCount === 0) {
      return false;
    }
    if (hasDevice === 'no' && deviceCount > 0) {
      return false;
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        rack.name?.toLowerCase().includes(searchLower) ||
        rack.rack_type?.toLowerCase().includes(searchLower) ||
        rack.type?.name?.toLowerCase().includes(searchLower) ||
        rack.site?.name?.toLowerCase().includes(searchLower) ||
        rack.description?.toLowerCase().includes(searchLower) ||
        rack.id?.toString().includes(searchLower)
      );
    }
    return true;
  }).sort((a, b) => {
    // Sort by name
    const nameA = a.name?.toLowerCase() || '';
    const nameB = b.name?.toLowerCase() || '';
    if (sortOrder === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  if (loading) return <div className="loading">Loading racks...</div>;

  if (showForm) {
    return <RackForm onSubmit={handleCreateRack} onCancel={() => setShowForm(false)} types={types} sites={sites} />;
  }

  if (selectedRack) {
    return <RackView
      rack={selectedRack}
      onBack={() => setSelectedRack(null)}
      onRefresh={loadData}
      onUpdateRack={(updatedRack) => {
        setSelectedRack(updatedRack);
        setRacks(racks.map(r => r.id === updatedRack.id ? updatedRack : r));
      }}
      types={types}
      sites={sites}
      nmsDevices={nmsDevices}
      loadingNmsDevices={loadingNmsDevices}
      showAssignModal={showAssignModal}
      setShowAssignModal={setShowAssignModal}
      loadNmsDevices={loadNmsDevices}
      assignDeviceToRack={assignDeviceToRack}
      removeDeviceFromRack={removeDeviceFromRack}
      nmsDeviceSearch={nmsDeviceSearch}
      setNmsDeviceSearch={setNmsDeviceSearch}
      updateNmsDevicePosition={updateNmsDevicePosition}
      editingNmsPosition={editingNmsPosition}
      setEditingNmsPosition={setEditingNmsPosition}
      viewNmsDeviceDetails={viewNmsDeviceDetails}
      viewingNmsDevice={viewingNmsDevice}
      loadingNmsDeviceDetail={loadingNmsDeviceDetail}
      nmsDeviceDetail={nmsDeviceDetail}
      setViewingNmsDevice={setViewingNmsDevice}
      refreshNmsDeviceDetails={refreshNmsDeviceDetails}
      nmsAutoRefresh={nmsAutoRefresh}
      setNmsAutoRefresh={setNmsAutoRefresh}
      nmsLastUpdated={nmsLastUpdated}
    />;
  }

  return (
    <div className="rack-manager">
      <div className="manager-header">
        <h2><Blinds size={24} className="header-icon" /> Rack Management</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Add Rack
        </button>
      </div>

      {/* Search and Filter */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search racks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter by Site */}
        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            outline: 'none',
            minWidth: '140px',
          }}
        >
          <option value="">All Sites</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>

        {/* Filter by Type */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            outline: 'none',
            minWidth: '140px',
          }}
        >
          <option value="">All Types</option>
          <option value="floor_standing">Floor Standing</option>
          <option value="wall_mount">Wall Mount</option>
          <option value="open_frame">Open Frame</option>
          <option value="outdoor">Outdoor</option>
        </select>

        {/* Filter by Device */}
        <select
          value={hasDevice}
          onChange={(e) => setHasDevice(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            outline: 'none',
            minWidth: '130px',
          }}
        >
          <option value="">All Racks</option>
          <option value="yes">With Device</option>
          <option value="no">Empty</option>
        </select>

        {/* Sort */}
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white',
            fontSize: '13px',
            cursor: 'pointer',
          }}
          title="Sort A-Z / Z-A"
        >
          {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </button>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '8px',
              border: viewMode === 'grid' ? '1px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '6px',
              background: viewMode === 'grid' ? '#eff6ff' : 'white',
              color: viewMode === 'grid' ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
            }}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px',
              border: viewMode === 'list' ? '1px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '6px',
              background: viewMode === 'list' ? '#eff6ff' : 'white',
              color: viewMode === 'list' ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
            }}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>

        {/* Clear & Count */}
        {(searchTerm || selectedSite || selectedType || hasDevice) && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setSelectedSite('');
              setSelectedType('');
              setHasDevice('');
            }}
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            Clear
          </button>
        )}
        <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>
          {filteredRacks.length} Rack{filteredRacks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredRacks.length === 0 ? (
        <div className="empty-state">
          <Server size={64} />
          <h3>No Racks Found</h3>
          <p>Create your first rack to organize your infrastructure</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Create Rack
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="racks-list">
          {filteredRacks.map(rack => (
            <div key={rack.id} className="rack-list-item" onClick={() => setSelectedRack(rack)}>
              <div className="rack-list-info">
                <div className="rack-list-header">
                  <h3>{rack.name}</h3>
                  <span className={`rack-type-badge ${rack.rack_type}`}>
                    {getRackTypeLabel(rack.rack_type)}
                  </span>
                </div>
                <div className="rack-list-details">
                  <span><Blinds size={14} /> {rack.type?.name || 'Rack'} ({rack.rack_height_u || 42}U)</span>
                  <span><Container size={14} /> {rack.site?.name || 'No Site'}</span>
                  <span className="rack-devices-count">
                    <MemoryStick size={14} /> {(rack.rack_devices_count || 0) + (rack.librenms_device_id || rack.librenms_hostname ? 1 : 0)} devices
                  </span>
                </div>
              </div>
              <div className="rack-list-capacity">
                <div className="capacity-bar-mini">
                  <div
                    className="capacity-fill-mini"
                    style={{ width: `${((rack.rack_devices_count || 0) + (rack.librenms_device_id || rack.librenms_hostname ? 1 : 0)) / (rack.rack_height_u || 42) * 100}%` }}
                  />
                </div>
                <span className="capacity-text">
                  {Math.round(((rack.rack_devices_count || 0) + (rack.librenms_device_id || rack.librenms_hostname ? 1 : 0)) / (rack.rack_height_u || 42) * 100)}% used
                </span>
              </div>
              <div className="rack-list-arrow">
                <Eye size={18} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="racks-grid">
          {filteredRacks.map(rack => (
            <div key={rack.id} className="rack-card" onClick={() => setSelectedRack(rack)}>
              <div className="rack-card-content">
                <div className="rack-header">
                  <h3>{rack.name}</h3>
                  <span className={`rack-type-badge ${rack.rack_type}`}>
                    {getRackTypeLabel(rack.rack_type)}
                  </span>
                </div>
                <div className="rack-body">
                  <div className="rack-stat">
                    <Blinds size={16} />
                    <span>{rack.type?.name || 'Rack'}</span>
                    <span style={{ marginLeft: '8px', color: '#666' }}>({rack.rack_height_u || 42}U)</span>
                  </div>
                  <div className="rack-devices-count">
                    {(rack.rack_devices_count || 0) + (rack.librenms_device_id || rack.librenms_hostname ? 1 : 0)} devices
                  </div>
                </div>
              </div>
              <div className="rack-location">
                {rack.site?.name && <span>{getSiteTypeIcon(rack.site.site_type)} {rack.site.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <button className="close-modal-btn" onClick={() => setShowImageModal(null)}>×</button>
            <h3 style={{ margin: '0 0 15px 0' }}>{showImageModal.type?.name || 'Rack'} - {(showImageModal.images || []).length} gambar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {(showImageModal.images || []).map((img, idx) => (
                <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  <img
                    src={`${process.env.REACT_APP_API_URL?.replace('/api', '')}/storage/${img.path}`}
                    alt={img.name}
                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div style={{ padding: '8px', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                      {img.name || `Image ${idx + 1}`}
                    </span>
                    <button
                      onClick={() => handleImageDownload(showImageModal.id, idx)}
                      style={{ background: '#dbeafe', color: '#2563eb', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleImageDelete(showImageModal.id, idx)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {(!showImageModal.images || showImageModal.images.length === 0) && (
              <p style={{ textAlign: 'center', color: '#6b7280' }}>No images</p>
            )}
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                <Upload size={16} />
                Tambah Foto
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    handleImageUpload(showImageModal.id, e);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RackForm = ({ onSubmit, onCancel, types, sites }) => {
  const [formData, setFormData] = useState({
    type_id: '',
    name: '',
    rack_type: 'floor_standing',
    rack_height_u: 42,
    rack_max_power_w: 2000,
    site_id: '',
    latitude: '',
    longitude: '',
    description: '',
    status: 'active',
  });

  // Get POP and Data Center sites for Allocation dropdown
  const availableSites = sites || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Clean up form data - remove empty strings for optional fields
    const cleanedData = {
      ...formData,
      type_id: formData.type_id ? parseInt(formData.type_id) : null,
      site_id: formData.site_id ? parseInt(formData.site_id) : null,
      rack_type: formData.rack_type || null,
      rack_height_u: formData.rack_height_u || 42,
      rack_max_power_w: formData.rack_max_power_w || null,
      latitude: formData.latitude || null,
      longitude: formData.longitude || null,
    };
    await onSubmit(cleanedData);
  };

  const rackTypes = types.filter(t => t.category === 'rack');

  return (
    <div className="rack-form-container">
      <div className="form-header">
        <h2>Add New Rack</h2>
        <button className="btn-close" onClick={onCancel}>×</button>
      </div>
      <form onSubmit={handleSubmit} className="site-form">
        <div className="form-row">
          <div className="form-group">
            <label>Rack Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              placeholder="e.g., Rack-1-OTB"
            />
          </div>
          <div className="form-group">
            <label>Rack Type *</label>
            <select
              name="type_id"
              value={formData.type_id}
              onChange={e => setFormData({...formData, type_id: e.target.value})}
              required
            >
              <option value="">Select Rack Type</option>
              {rackTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Allocation *</label>
            <select
              name="site_id"
              value={formData.site_id}
              onChange={e => setFormData({...formData, site_id: e.target.value})}
              required
            >
              <option value="">Select POP / Data Center</option>
              {availableSites.length === 0 ? (
                <option value="" disabled>No sites available - create site first</option>
              ) : (
                availableSites.map(site => (
                  <option key={site.id} value={site.id}>
                    {getSiteTypeIcon(site.site_type)} {site.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Rack Height (U)</label>
          <select
            name="rack_height_u"
            value={formData.rack_height_u || ''}
            onChange={e => setFormData({...formData, rack_height_u: parseInt(e.target.value)})}
          >
            <option value="">Select Height</option>
            <option value="6">6U</option>
            <option value="9">9U</option>
            <option value="12">12U</option>
            <option value="15">15U</option>
            <option value="18">18U</option>
            <option value="22">22U</option>
            <option value="27">27U</option>
            <option value="32">32U</option>
            <option value="37">37U</option>
            <option value="42">42U</option>
            <option value="45">45U</option>
            <option value="48">48U</option>
          </select>
        </div>

        <div className="form-group">
          <label>Max Power (Watts)</label>
          <input
            type="number"
            name="rack_max_power_w"
            value={formData.rack_max_power_w}
            onChange={e => setFormData({...formData, rack_max_power_w: parseInt(e.target.value)})}
            placeholder="2000"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary">Create Rack</button>
        </div>
      </form>
    </div>
  );
};

const RackView = ({ rack, onBack, onRefresh, onUpdateRack, types, sites, nmsDevices, loadingNmsDevices, showAssignModal, setShowAssignModal, loadNmsDevices, assignDeviceToRack, removeDeviceFromRack, nmsDeviceSearch, setNmsDeviceSearch, updateNmsDevicePosition, editingNmsPosition, setEditingNmsPosition, viewNmsDeviceDetails, viewingNmsDevice, loadingNmsDeviceDetail, nmsDeviceDetail, setViewingNmsDevice, refreshNmsDeviceDetails, nmsAutoRefresh, setNmsAutoRefresh, nmsLastUpdated }) => {
  const [devices, setDevices] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showImageModal, setShowImageModal] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(null);
  const [currentRack, setCurrentRack] = useState(rack); // Local state for rack to reflect changes immediately
  const [rackKey, setRackKey] = useState(0); // Force re-render when images change
  const rackHeight = currentRack.rack_height_u || 42; // Default 42U if not set
  // Calculate total U used (devices + NMS device)
  const hasNmsDevice = currentRack.librenms_device_id || currentRack.librenms_hostname;
  const nmsUHeight = hasNmsDevice ? (currentRack.librenms_device_u_height || 1) : 0;
  const totalUUsed = devices.reduce((sum, device) => sum + (device.u_height || 1), 0) + nmsUHeight;

  // Sync currentRack when rack prop changes
  useEffect(() => {
    setCurrentRack(rack);
  }, [rack]);

  // Load devices when component mounts
  useEffect(() => {
    loadDevices();
  }, [rack.id]);

  const loadDevices = async () => {
    try {
      const res = await infrastructureService.getAll();
      const rackId = parseInt(rack.id);
      // Filter infrastructure yang ada di rack ini
      const rackDevices = res.data.filter(infra =>
        parseInt(infra.rack_id) === rackId && infra.u_position
      );
      console.log('All infras:', res.data);
      console.log('Rack devices for rack', rackId, ':', rackDevices.map(d => ({name: d.name, u_position: d.u_position, u_height: d.u_height})));
      setDevices(rackDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const handleImageUpload = async (rackId, e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(rackId);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images[]', files[i]);
    }
    try {
      const response = await infrastructureService.uploadImage(rackId, formData);
      const updatedImages = [...(currentRack.images || []), ...response.data.images];
      const updatedRack = { ...currentRack, images: updatedImages };
      setCurrentRack(updatedRack);
      setShowImageModal(updatedRack);
      setRackKey(prev => prev + 1); // Force re-render
      onRefresh();
      onUpdateRack(updatedRack); // Update parent state
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (rackId, index) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await infrastructureService.deleteImage(rackId, index);
      const updatedImages = currentRack.images.filter((_, i) => i !== index);
      const updatedRack = { ...currentRack, images: updatedImages };
      // Update local state to reflect changes immediately
      setCurrentRack(updatedRack);
      setShowImageModal(updatedRack);
      setRackKey(prev => prev + 1); // Force re-render
      onRefresh();
      onUpdateRack(updatedRack); // Update parent state
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const handleImageDownload = async (rackId, index) => {
    try {
      const imageName = rack.images?.[index]?.name || 'image';
      const response = await infrastructureService.downloadImage(rackId, index);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = imageName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Gagal mendownload gambar');
    }
  };

  const handleEdit = () => {
    setEditData({
      type_id: rack.type_id || '',
      name: rack.name || '',
      rack_type: rack.rack_type || 'floor_standing',
      rack_height_u: rack.rack_height_u || 42,
      rack_max_power_w: rack.rack_max_power_w || 2000,
      site_id: rack.site_id || '',
      description: rack.description || '',
      status: rack.status || 'active',
    });
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete rack "${rack.name}"?`)) return;

    try {
      await infrastructureService.delete(rack.id);
      onRefresh();
      onBack();
    } catch (error) {
      console.error('Error deleting rack:', error);
      alert(error.response?.data?.message || 'Failed to delete rack');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const cleanedData = {
        ...editData,
        type_id: editData.type_id ? parseInt(editData.type_id) : null,
        site_id: editData.site_id ? parseInt(editData.site_id) : null,
        rack_type: editData.rack_type || null,
        rack_height_u: editData.rack_height_u || 42,
        rack_max_power_w: editData.rack_max_power_w || null,
      };
      await infrastructureService.update(rack.id, cleanedData);
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating rack:', error);
      alert(error.response?.data?.message || 'Failed to update rack');
    }
  };

  const getDeviceTypeIcon = (device) => {
    if (!device.type) return <Server size={18} />;
    const category = device.type.category || '';
    const icons = {
      'server': <Server size={18} />,
      'router': <Router size={18} />,
      'switch': <KeyboardMusic size={18} />,
      'otb': <GalleryThumbnails size={18} />,
      'olt': <MemoryStick size={18} />,
    };
    return icons[category] || <Server size={18} />;
  };

  // Filter rack types
  const rackTypes = (types || []).filter(t => t.category === 'rack');
  const availableSites = sites || [];

  if (isEditing) {
    return (
      <div className="rack-form-container">
        <div className="form-header">
          <h2>Edit Rack</h2>
          <button className="btn-close" onClick={() => setIsEditing(false)}>×</button>
        </div>
        <form onSubmit={handleUpdate} className="site-form">
          <div className="form-row">
            <div className="form-group">
              <label>Rack Name *</label>
              <input
                type="text"
                name="name"
                value={editData.name}
                onChange={e => setEditData({...editData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Rack Type *</label>
              <select
                name="type_id"
                value={editData.type_id}
                onChange={e => setEditData({...editData, type_id: e.target.value})}
                required
              >
                <option value="">Select Rack Type</option>
                {rackTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Enclosure Type *</label>
              <select
                name="rack_type"
                value={editData.rack_type}
                onChange={e => setEditData({...editData, rack_type: e.target.value})}
                required
              >
                <option value="floor_standing">Rack Floor Standing</option>
                <option value="wall_mount">Rack Wallmount</option>
                <option value="open_frame">Rack Open Frame</option>
                <option value="outdoor">Rack Outdoor</option>
              </select>
            </div>
            <div className="form-group">
              <label>Allocation</label>
              <select
                name="site_id"
                value={editData.site_id}
                onChange={e => setEditData({...editData, site_id: e.target.value})}
              >
                <option value="">Select POP / Data Center</option>
                {availableSites.map(site => (
                  <option key={site.id} value={site.id}>
                    {getSiteTypeIcon(site.site_type)} {site.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Rack Height (U)</label>
              <select
                name="rack_height_u"
                value={editData.rack_height_u || ''}
                onChange={e => setEditData({...editData, rack_height_u: parseInt(e.target.value)})}
              >
                <option value="">Select Height</option>
                <option value="12">12U</option>
                <option value="22">22U</option>
                <option value="27">27U</option>
                <option value="32">32U</option>
                <option value="37">37U</option>
                <option value="42">42U</option>
                <option value="45">45U</option>
                <option value="48">48U</option>
              </select>
            </div>
            <div className="form-group">
              <label>Max Power (Watts)</label>
              <input
                type="number"
                name="rack_max_power_w"
                value={editData.rack_max_power_w}
                onChange={e => setEditData({...editData, rack_max_power_w: parseInt(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={editData.status}
                onChange={e => setEditData({...editData, status: e.target.value})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={editData.description}
              onChange={e => setEditData({...editData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rack-view" key={rackKey}>
      <div className="rack-view-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <h2><Blinds size={24} className="header-icon" /> {currentRack.name}</h2>
        <div className="rack-actions">
          <button className="btn btn-primary" onClick={handleEdit} title="Edit"><Pencil size={16} /> Edit</button>
          <button className="btn" onClick={() => { loadNmsDevices(); setShowAssignModal(true); }} title="Assign NMS Device" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #3b82f6' }}>
            <Network size={16} /> Assign Device
          </button>
          {currentRack.images?.length > 0 ? (
            <button className="btn" onClick={() => setShowImageModal(currentRack)} title="View Images" style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #f59e0b' }}>
              <Image size={16} /> ({currentRack.images.length})
            </button>
          ) : (
            <label className="btn" title="Add Photo" style={{ cursor: 'pointer', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #10b981' }}>
              <Upload size={16} /> Photo
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleImageUpload(currentRack.id, e)}
                disabled={uploadingImage === currentRack.id}
              />
            </label>
          )}
          <button className="btn btn-danger" onClick={handleDelete} title="Delete"><Trash2 size={16} /> Delete</button>
        </div>
      </div>

      {/* Combined devices list: NMS assigned device + infrastructure devices */}
      {(() => {
        const allDevices = [...devices];
        // Add NMS assigned device as a virtual device at the bottom of rack
        if (currentRack.librenms_device_id || currentRack.librenms_hostname) {
          // We'll show it separately in the banner, but also add to devices list for display
          // Calculate next available position
          const maxU = Math.max(0, ...devices.map(d => parseInt(d.u_position || 0) + (d.u_height || 1) - 1));
          const nmsDevice = {
            id: 'nms-' + currentRack.librenms_device_id,
            name: currentRack.librenms_hostname,
            u_position: maxU + 1,
            u_height: 2, // Default 2U for NMS device
            isNmsDevice: true,
          };
          // Add to list for display (but not in the main devices array to avoid conflicts)
        }
        return null;
      })()}

      <div className="rack-info-grid">
        <div className="info-card">
          <h4>Capacity ({rackHeight}U)</h4>
          <div className="capacity-visual">
            {Array.from({length: rackHeight}).map((_, i) => {
              const currentU = i + 1;
              // Find device that occupies this U position (considering u_height)
              const deviceAtU = devices.find(d => {
                const uPos = parseInt(d.u_position);
                const uHeight = d.u_height || 1;
                return currentU >= uPos && currentU < uPos + uHeight;
              });

              // Check if this is where NMS device would be (based on stored U position)
              const nmsUPos = currentRack.librenms_device_u_position || 1;
              const nmsUHeight = currentRack.librenms_device_u_height || 1;
              const isNmsDeviceSlot = (currentRack.librenms_device_id || currentRack.librenms_hostname) &&
                currentU >= nmsUPos && currentU < nmsUPos + nmsUHeight;

              // Get hardware name from NMS devices
              const nmsDeviceInfo = isNmsDeviceSlot ? nmsDevices?.find(d => d.hostname === currentRack.librenms_hostname) : null;
              const hardwareName = nmsDeviceInfo?.hardware || currentRack.librenms_hostname;

              return (
                <div
                  key={i}
                  className={`u-slot ${deviceAtU ? 'occupied' : (isNmsDeviceSlot ? 'occupied nms-device' : 'available')}`}
                  title={`U${i + 1}${deviceAtU ? `: ${deviceAtU.name}` : (isNmsDeviceSlot ? `: ${hardwareName} (NMS)` : '')}`}
                >
                  <span className="u-number">{i + 1}</span>
                  {deviceAtU ? (
                    <span className="device-name">{deviceAtU.name}</span>
                  ) : isNmsDeviceSlot ? (
                    <>
                      <span className="device-name">{hardwareName}</span>
                      <span className="nms-label">NMS</span>
                    </>
                  ) : (
                    <span className="device-name" style={{ color: '#d1d5db' }}>Available</span>
                  )}
                  <span className="u-label">{i + 1}</span>
                </div>
              );
            })}
          </div>
          <p>{totalUUsed} / {rackHeight} U used</p>
        </div>

        <div className="info-card">
          <h4>Devices ({devices.length + (currentRack.librenms_device_id ? 1 : 0)})</h4>
          <div className="devices-list">
            {/* Show NMS assigned device first */}
            {(currentRack.librenms_device_id || currentRack.librenms_hostname) && (() => {
              // Find the NMS device to get sysName
              const nmsDevice = nmsDevices?.find(d => d.hostname === currentRack.librenms_hostname);
              return (
              <div key="nms-device" className="device-item" style={{ background: '#dbeafe', border: '1px solid #3b82f6' }}>
                <span className="device-icon"><Network size={16} /></span>
                <div className="device-info">
                  <div className="device-name">
                    {nmsDevice?.hardware || currentRack.librenms_hostname} | U{currentRack.librenms_device_u_position || 1}{currentRack.librenms_device_u_height > 1 ? `-U${currentRack.librenms_device_u_position + currentRack.librenms_device_u_height - 1}` : ''}
                  </div>
                  <div className="device-position">
                    {currentRack.librenms_hostname} | {nmsDevice?.sysName || '-'}
                  </div>
                </div>
                <button
                  onClick={() => viewNmsDeviceDetails(currentRack.librenms_hostname)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#10b981' }}
                  title="View Device Details"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => setEditingNmsPosition(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#3b82f6' }}
                  title="Edit U Position"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={removeDeviceFromRack}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#dc2626' }}
                  title="Remove from Rack"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              );
            })()}
            {devices.length === 0 && !currentRack.librenms_hostname ? (
              <p className="empty">No devices in this rack</p>
            ) : (
              devices.map(device => {
                const uPos = device.u_position;
                const uHeight = device.u_height || 1;
                const uRange = uHeight > 1 ? `U${uPos}-${uPos + uHeight - 1}` : `U${uPos}`;
                return (
                <div key={device.id} className="device-item">
                  <span className="device-icon">{getDeviceTypeIcon(device)}</span>
                  <div className="device-info">
                    <div className="device-name">{device.name}</div>
                    <div className="device-position">{uRange}</div>
                  </div>
                  {device.power_w && <span className="device-power">{device.power_w}W</span>}
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <button className="close-modal-btn" onClick={() => setShowImageModal(null)}>×</button>
            <h3 style={{ margin: '0 0 15px 0' }}>{showImageModal.type?.name || 'Rack'} - {(showImageModal.images || []).length} gambar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {(showImageModal.images || []).map((img, idx) => (
                <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  <img
                    src={`${process.env.REACT_APP_API_URL?.replace('/api', '')}/storage/${img.path}`}
                    alt={img.name}
                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div style={{ padding: '8px', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                      {img.name || `Image ${idx + 1}`}
                    </span>
                    <button
                      onClick={() => handleImageDownload(showImageModal.id, idx)}
                      style={{ background: '#dbeafe', color: '#2563eb', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleImageDelete(showImageModal.id, idx)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {(!showImageModal.images || showImageModal.images.length === 0) && (
              <p style={{ textAlign: 'center', color: '#6b7280' }}>No images</p>
            )}
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                <Upload size={16} />
                Tambah Foto
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    handleImageUpload(showImageModal.id, e);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Assign NMS Device Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
            <button className="close-modal-btn" onClick={() => setShowAssignModal(false)}>×</button>
            <h3 style={{ margin: '0 0 15px 0' }}>Assign NMS Device to {currentRack?.name}</h3>

            {loadingNmsDevices ? (
              <p>Loading devices...</p>
            ) : (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={nmsDeviceSearch}
                    onChange={(e) => setNmsDeviceSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                </div>
                <div style={{ marginBottom: '15px', padding: '10px', background: '#fef3c7', borderRadius: '6px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>U Position:</label>
                  <select
                    id="uPositionSelect"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                  >
                    <option value="">Select U Position</option>
                    {Array.from({length: rackHeight}, (_, i) => i + 1).map(u => {
                      const isOccupiedByDevice = devices.some(d => {
                        const dUPos = d.u_position || 1;
                        const dUHeight = d.u_height || 1;
                        return u >= dUPos && u < dUPos + dUHeight;
                      });
                      // Also check if NMS device occupies this U
                      const nmsUPos = currentRack?.librenms_device_u_position || 1;
                      const nmsUHeight = currentRack?.librenms_device_u_height || 1;
                      const isOccupiedByNms = u >= nmsUPos && u < nmsUPos + nmsUHeight;
                      if (isOccupiedByDevice || isOccupiedByNms) return null;
                      return <option key={u} value={u}>U{u}</option>;
                    })}
                    {Array.from({length: Math.max(0, rackHeight - 1)}, (_, i) => i + 1).map(u => {
                      const rangeStart = u;
                      const rangeEnd = u + 1;
                      const isOccupiedByDevice = devices.some(d => {
                        const dUPos = d.u_position || 1;
                        const dUHeight = d.u_height || 1;
                        return (rangeStart >= dUPos && rangeStart < dUPos + dUHeight) ||
                               (rangeEnd > dUPos && rangeEnd <= dUPos + dUHeight) ||
                               (rangeStart <= dUPos && rangeEnd >= dUPos + dUHeight);
                      });
                      // Also check if NMS device occupies this range
                      const nmsUPos = currentRack?.librenms_device_u_position || 1;
                      const nmsUHeight = currentRack?.librenms_device_u_height || 1;
                      const isOccupiedByNms = (rangeStart >= nmsUPos && rangeStart < nmsUPos + nmsUHeight) ||
                                              (rangeEnd > nmsUPos && rangeEnd <= nmsUPos + nmsUHeight) ||
                                              (rangeStart <= nmsUPos && rangeEnd >= nmsUPos + nmsUHeight);
                      if (isOccupiedByDevice || isOccupiedByNms) return null;
                      return <option key={`${u}-${u+1}`} value={`${u}-${u+1}`}>U{u}-U{u+1} (2U)</option>;
                    })}
                  </select>
                </div>
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {nmsDevices.filter(device =>
                    !nmsDeviceSearch ||
                    device.hostname?.toLowerCase().includes(nmsDeviceSearch.toLowerCase()) ||
                    device.ip?.toLowerCase().includes(nmsDeviceSearch.toLowerCase()) ||
                    device.os?.toLowerCase().includes(nmsDeviceSearch.toLowerCase()) ||
                    device.location?.toLowerCase().includes(nmsDeviceSearch.toLowerCase())
                  ).map(device => (
                    <div
                      key={device.device_id}
                      onClick={() => {
                        const select = document.getElementById('uPositionSelect');
                        const uPos = select?.value || '1';
                        assignDeviceToRack(device, uPos);
                      }}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: currentRack?.librenms_device_id === device.device_id ? '#dbeafe' : '#fff',
                        hover: { background: '#f3f4f6' }
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{device.hostname}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        IP: {device.ip} | OS: {device.os} | Status: {device.status === 1 ? 'Online' : 'Offline'}
                      </div>
                      {device.location && (
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Location: {device.location}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit NMS Device Position Modal */}
      {editingNmsPosition && (
        <div className="modal-overlay" onClick={() => setEditingNmsPosition(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <button className="close-modal-btn" onClick={() => setEditingNmsPosition(false)}>×</button>
            <h3 style={{ margin: '0 0 15px 0' }}>Edit U Position - {currentRack?.librenms_hostname}</h3>

            <div style={{ marginBottom: '15px', padding: '10px', background: '#fef3c7', borderRadius: '6px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select U Position:</label>
              <select
                id="editUPositionSelect"
                defaultValue={currentRack?.librenms_device_u_position ? `${currentRack.librenms_device_u_position}${currentRack.librenms_device_u_height > 1 ? `-${currentRack.librenms_device_u_position + currentRack.librenms_device_u_height - 1}` : ''}` : '1'}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
              >
                <option value="">Select U Position</option>
                {Array.from({length: rackHeight}, (_, i) => i + 1).map(u => {
                  const isOccupiedByDevice = devices.some(d => {
                    const dUPos = d.u_position || 1;
                    const dUHeight = d.u_height || 1;
                    return u >= dUPos && u < dUPos + dUHeight;
                  });
                  // Also check if NMS device currently occupies this U (its current position)
                  const nmsUPos = currentRack?.librenms_device_u_position || 1;
                  const nmsUHeight = currentRack?.librenms_device_u_height || 1;
                  const isOccupiedByNms = u >= nmsUPos && u < nmsUPos + nmsUHeight;
                  if (isOccupiedByDevice || isOccupiedByNms) return null;
                  return (
                    <option key={u} value={u}>U{u}</option>
                  );
                })}
                {Array.from({length: Math.max(0, rackHeight - 1)}, (_, i) => i + 1).map(u => {
                  const rangeStart = u;
                  const rangeEnd = u + 1;
                  const isOccupiedByDevice = devices.some(d => {
                    const dUPos = d.u_position || 1;
                    const dUHeight = d.u_height || 1;
                    return (rangeStart >= dUPos && rangeStart < dUPos + dUHeight) ||
                           (rangeEnd > dUPos && rangeEnd <= dUPos + dUHeight) ||
                           (rangeStart <= dUPos && rangeEnd >= dUPos + dUHeight);
                  });
                  // Also check if NMS device currently occupies this range
                  const nmsUPos = currentRack?.librenms_device_u_position || 1;
                  const nmsUHeight = currentRack?.librenms_device_u_height || 1;
                  const isOccupiedByNms = (rangeStart >= nmsUPos && rangeStart < nmsUPos + nmsUHeight) ||
                                          (rangeEnd > nmsUPos && rangeEnd <= nmsUPos + nmsUHeight) ||
                                          (rangeStart <= nmsUPos && rangeEnd >= nmsUPos + nmsUHeight);
                  if (isOccupiedByDevice || isOccupiedByNms) return null;
                  return (
                    <option key={`${u}-${u+1}`} value={`${u}-${u+1}`}>U{u}-U{u+1} (2U)</option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setEditingNmsPosition(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const select = document.getElementById('editUPositionSelect');
                  const uPos = select?.value || '1';
                  updateNmsDevicePosition(uPos);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NMS Device Detail Modal */}
      {viewingNmsDevice && (
        <div className="modal-overlay" onClick={() => setViewingNmsDevice(null)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <button className="close-modal-btn" onClick={() => setViewingNmsDevice(null)}>×</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {nmsLastUpdated && (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Last updated: {nmsLastUpdated.toLocaleTimeString()}
                  </span>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={refreshNmsDeviceDetails}
                  disabled={loadingNmsDeviceDetail}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <RefreshCw size={14} style={{ marginRight: '4px' }} />
                  Refresh
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={nmsAutoRefresh}
                    onChange={(e) => setNmsAutoRefresh(e.target.checked)}
                  />
                  Auto (10s)
                </label>
              </div>
            </div>

            {loadingNmsDeviceDetail ? (
              <div className="loading">Loading device details...</div>
            ) : nmsDeviceDetail ? (
              <>
                <div className="device-detail-header">
                  <div className="device-icon-large" style={{ color: '#009688' }}>
                    <Router size={20} />
                  </div>
                  <div>
                    <h2>{nmsDeviceDetail.device?.hostname || viewingNmsDevice}</h2>
                    <p>{nmsDeviceDetail.device?.ip} • {nmsDeviceDetail.device?.os}</p>
                    <div className="device-detail-status">
                      {nmsDeviceDetail.device?.status === 1 ? (
                        <>
                          <CircleCheckBig size={16} className="status-online" />
                          <span>Online</span>
                        </>
                      ) : (
                        <>
                          <CircleX size={16} className="status-offline" />
                          <span>Offline</span>
                        </>
                      )}
                      {nmsDeviceDetail.device?.uptime && (
                        <>
                          <span>•</span>
                          <span>Uptime: {formatUptime(nmsDeviceDetail.device.uptime)}</span>
                        </>
                      )}
                      {nmsDeviceDetail.device?.device_id && (
                        <a
                          href={`https://librenms.gsmnet.co.id/device/${nmsDeviceDetail.device.device_id}/ports`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="librenms-link"
                        >
                          View in LibreNMS →
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="device-detail-info">
                  <div className="info-row">
                    <span className="label">System Name:</span>
                    <span className="value">{nmsDeviceDetail.device?.sysName || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Resolved IP:</span>
                    <span className="value">{nmsDeviceDetail.device?.ip || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Hardware:</span>
                    <span className="value">{nmsDeviceDetail.device?.hardware || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Operating System:</span>
                    <span className="value">{nmsDeviceDetail.device?.os} {nmsDeviceDetail.device?.version}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Object ID:</span>
                    <span className="value">{nmsDeviceDetail.device?.object_id || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Contact:</span>
                    <span className="value">{nmsDeviceDetail.device?.contact || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Device Added:</span>
                    <span className="value">{nmsDeviceDetail.device?.inserted ? formatRelativeTime(nmsDeviceDetail.device.inserted) : '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Last Discovered:</span>
                    <span className="value">{nmsDeviceDetail.device?.last_discovered ? formatRelativeTime(nmsDeviceDetail.device.last_discovered) : '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Uptime:</span>
                    <span className="value">{nmsDeviceDetail.device?.uptime ? formatUptime(nmsDeviceDetail.device.uptime) : '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Location:</span>
                    <span className="value">{nmsDeviceDetail.device?.location || '-'}</span>
                  </div>
                </div>

                {nmsDeviceDetail.ports && nmsDeviceDetail.ports.length > 0 && (
                  <div className="port-section">
                    <h4 style={{ marginBottom: '10px' }}>Ports ({nmsDeviceDetail.ports.length})</h4>
                    <div className="ports-table" style={{ maxHeight: '300px', overflow: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Port</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Speed</th>
                            <th>Traffic In</th>
                            <th>Traffic Out</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nmsDeviceDetail.ports.slice(0, 30).map(port => (
                            <tr key={port.port_id}>
                              <td>{port.ifName || port.ifDescr}</td>
                              <td>{port.ifDescr}</td>
                              <td>
                                <span className={`port-${(String(port.ifOperStatus).toLowerCase() === 'up' || port.ifOperStatus === 'Dormant') ? 'up' : 'down'}`}>
                                  {String(port.ifOperStatus).toLowerCase() === 'up' ? 'Up' : 'Down'}
                                </span>
                              </td>
                              <td>{port.ifSpeed ? `${(port.ifSpeed / 1000000).toFixed(0)} Mbps` : '-'}</td>
                              <td>{formatTraffic(port.ifInOctets_rate)}</td>
                              <td>{formatTraffic(port.ifOutOctets_rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty">No device details available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for formatting
const formatRelativeTime = (dateStr) => {
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
  if (diffMins > 0) return `${diffMins} min`;
  return `${diffSecs} sec`;
};

const formatUptime = (seconds) => {
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const formatTraffic = (octets) => {
  if (!octets) return '-';
  const bps = octets * 8; // Convert to bits per second
  if (bps >= 1000000000) return `${(bps / 1000000000).toFixed(2)} GB/s`;
  if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} MB/s`;
  if (bps >= 1000) return `${(bps / 1000).toFixed(2)} KB/s`;
  return `${bps.toFixed(0)} B/s`;
};

export default RackManager;
