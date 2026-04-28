import React, { useState, useEffect } from 'react';
import { infrastructureService, infrastructureTypeService, siteService, portService } from '../services/services';
import { MemoryStick, Plus, Pencil, Trash2, HardDrive, Eye, MapPin, Search, Upload, Image } from 'lucide-react';
import './OLTManager.css';

const OLTManager = () => {
  const [olts, setOlts] = useState([]);
  const [types, setTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [racks, setRacks] = useState([]);
  const [allInfrastructures, setAllInfrastructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOLT, setSelectedOLT] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [uploadingImage, setUploadingImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [infrasRes, typesRes, sitesRes] = await Promise.all([
        infrastructureService.getAll(),
        infrastructureTypeService.getAll(),
        siteService.getAll(),
      ]);

      // Filter only OLTs
      const oltTypeIds = typesRes.data.filter(t => t.category === 'olt').map(t => t.id);
      const oltItems = infrasRes.data.filter(i => oltTypeIds.includes(i.type_id));
      setOlts(oltItems);

      // Filter racks for dropdown
      const rackTypeIds = typesRes.data.filter(t => t.category === 'rack').map(t => t.id);
      const rackItems = infrasRes.data.filter(i => rackTypeIds.includes(i.type_id));
      setRacks(rackItems);

      // Store all infrastructures for occupied position calculation
      setAllInfrastructures(infrasRes.data);

      setTypes(typesRes.data);
      setSites(sitesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOLT = async (oltData) => {
    try {
      await infrastructureService.create(oltData);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating OLT:', error);
      alert(error.response?.data?.message || 'Failed to create OLT');
    }
  };

  const handleDeleteOLT = async (oltId) => {
    if (!window.confirm('Are you sure you want to delete this OLT?')) return;

    try {
      await infrastructureService.delete(oltId);
      loadData();
    } catch (error) {
      console.error('Error deleting OLT:', error);
      alert(error.response?.data?.message || 'Failed to delete OLT');
    }
  };

  const handleImageUpload = async (oltId, e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(oltId);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images[]', files[i]);
    }

    try {
      const response = await infrastructureService.uploadImage(oltId, formData);
      const olt = olts.find(o => o.id === oltId);
      const existingImages = olt?.images || [];
      const newImages = [...existingImages, ...response.data.images];
      setOlts(olts.map(olt =>
        olt.id === oltId ? { ...olt, images: newImages } : olt
      ));
      loadData();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (oltId, index) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await infrastructureService.deleteImage(oltId, index);
      const updatedOlts = olts.map(olt =>
        olt.id === oltId
          ? { ...olt, images: olt.images.filter((_, i) => i !== index) }
          : olt
      );
      setOlts(updatedOlts);
      // Update modal to reflect changes immediately
      if (showImageModal) {
        const updatedModalOlt = updatedOlts.find(olt => olt.id === oltId);
        if (updatedModalOlt) {
          setShowImageModal(updatedModalOlt);
        }
      }
      loadData();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const handleImageDownload = async (oltId, index) => {
    try {
      const olt = olts.find(o => o.id === oltId);
      const imageName = olt?.images?.[index]?.name || 'image';
      const response = await infrastructureService.downloadImage(oltId, index);
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

  const getOLTTypeLabel = (type) => {
    if (!type) return 'OLT';
    return type.name || 'OLT';
  };

  if (loading) return <div className="loading">Loading OLTs...</div>;

  if (showForm) {
    return <OLTForm onSubmit={handleCreateOLT} onCancel={() => setShowForm(false)} types={types} sites={sites} racks={racks} allInfrastructures={allInfrastructures} />;
  }

  if (selectedOLT) {
    return <OLTView olt={selectedOLT} onBack={() => setSelectedOLT(null)} onRefresh={loadData} types={types} sites={sites} racks={racks} allInfrastructures={allInfrastructures} />;
  }

  // Filter OLTs based on search and site selection
  const filteredOlts = olts.filter(olt => {
    // Filter by site
    if (selectedSite && olt.site_id !== parseInt(selectedSite)) {
      return false;
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        olt.name?.toLowerCase().includes(searchLower) ||
        olt.type?.name?.toLowerCase().includes(searchLower) ||
        olt.site?.name?.toLowerCase().includes(searchLower) ||
        olt.rack?.name?.toLowerCase().includes(searchLower) ||
        olt.address?.toLowerCase().includes(searchLower) ||
        olt.notes?.toLowerCase().includes(searchLower) ||
        olt.id?.toString().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="olt-manager">
      <div className="manager-header">
        <h2><MemoryStick size={20} className="header-icon" /> OLT Management</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add OLT
        </button>
      </div>

      {/* Search and Filter */}
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search OLTs by name, type, site, rack..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
        >
          <option value="">All Sites</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
        {(searchTerm || selectedSite) && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setSelectedSite('');
            }}
          >
            Clear
          </button>
        )}
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {filteredOlts.length} OLT{filteredOlts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredOlts.length === 0 ? (
        <div className="empty-state">
          <MemoryStick size={64} />
          <h3>No OLTs Found</h3>
          <p>Create your first OLT to manage your network</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Create OLT
          </button>
        </div>
      ) : (
        <div className="olts-grid">
          {filteredOlts.map(olt => (
            <div key={olt.id} className="olt-card" onClick={() => setSelectedOLT(olt)}>
              <div className="olt-card-content">
                <div className="olt-header">
                  <h3>{olt.name}</h3>
                  <span className="olt-type-badge">
                    {getOLTTypeLabel(olt.type)}
                  </span>
                </div>
                <div className="olt-body">
                  <div className="olt-stat">
                    <MemoryStick size={14} />
                    <span>{olt.type?.name || 'OLT'}</span>
                  </div>
                  <div className="olt-rack-location">
                    {olt.rack && <span>Rack: {olt.rack.name}</span>}
                    {olt.u_position && <span> (U{olt.u_position})</span>}
                  </div>
                  <div className="olt-site-location">
                    {olt.site && <span> {olt.site.name}</span>}
                  </div>
                  <div className="olt-ports-info">
                    {olt.ports_count || 0} ports
                  </div>
                </div>
              </div>
              {/* Action buttons */}
              <div className="card-actions">
                {/* Combined Image/Photo button */}
                {olt.images?.length > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowImageModal(olt); }}
                    style={{
                      flex: '1 1 auto',
                      padding: '6px 10px',
                      fontSize: '11px',
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      minWidth: '70px',
                    }}
                  >
                    <Image size={12} /> ({olt.images.length})
                  </button>
                ) : (
                  <label
                    style={{
                      flex: '1 1 auto',
                      padding: '6px 10px',
                      fontSize: '11px',
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #10b981',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      minWidth: '70px',
                    }}
                    title="Add Photo"
                  >
                    <Upload size={12} />
                    Photo
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => { e.stopPropagation(); handleImageUpload(olt.id, e); }}
                      disabled={uploadingImage === olt.id}
                    />
                  </label>
                )}
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
            <h3 style={{ margin: '0 0 15px 0' }}>{showImageModal.type?.name || 'OLT'} - {(showImageModal.images || []).length} gambar</h3>
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
          </div>
        </div>
      )}
    </div>
  );
};

const OLTForm = ({ onSubmit, onCancel, types, sites, racks, allInfrastructures }) => {
  const [formData, setFormData] = useState({
    type_id: '',
    name: '',
    rack_id: '',
    site_id: '',
    u_position: '',
    u_height: 1,
    latitude: '',
    longitude: '',
    description: '',
    status: 'active',
  });

  const availableSites = sites || [];
  const allRacks = racks || [];
  const oltTypes = types.filter(t => t.category === 'olt');

  // Get selected OLT type info
  const selectedType = oltTypes.find(t => t.id === parseInt(formData.type_id));
  const oltHeight = selectedType?.default_u_height || 1;

  // Get selected rack from all racks (not filtered by site)
  const selectedRackId = formData.rack_id ? parseInt(formData.rack_id) : null;
  const selectedRack = selectedRackId ? allRacks.find(r => r.id === selectedRackId || r.id === formData.rack_id) : null;
  const rackHeight = selectedRack?.rack_height_u || 42;

  // Filter racks based on selected site for dropdown display
  const filteredRacks = formData.site_id
    ? allRacks.filter(r => r.site_id === parseInt(formData.site_id))
    : allRacks;

  // Get occupied positions in selected rack (exclude current item being edited)
  // Use allInfrastructures to include OLT, OTB, and other devices in the rack
  const occupiedData = (allInfrastructures || [])
    .filter(r => parseInt(r.rack_id) === parseInt(formData.rack_id) && r.id !== formData.id && r.u_position)
    .map(r => ({ u_position: r.u_position, u_height: r.u_height || 1 }));

  // Calculate all occupied U positions (for display)
  const occupiedPositionsList = [];
  occupiedData.forEach(d => {
    for (let i = 0; i < d.u_height; i++) {
      occupiedPositionsList.push(d.u_position + i);
    }
  });
  const uniqueOccupiedPositions = [...new Set(occupiedPositionsList)].sort((a, b) => a - b);

  // Calculate available U positions that can fit the OLT height
  const availableUPositions = [];
  for (let u = 1; u <= rackHeight - oltHeight + 1; u++) {
    // Check if all positions from u to u+oltHeight-1 are available
    let canFit = true;
    for (let h = 0; h < oltHeight; h++) {
      const pos = occupiedData.find(o => o.u_position === u + h);
      if (pos) {
        canFit = false;
        break;
      }
    }
    if (canFit) {
      availableUPositions.push(u);
    }
  }

  const handleSiteChange = (e) => {
    setFormData({
      ...formData,
      site_id: e.target.value,
      rack_id: '',
      u_position: '',
    });
  };

  const handleTypeChange = (e) => {
    const typeId = e.target.value;
    const type = oltTypes.find(t => t.id === parseInt(typeId));
    setFormData({
      ...formData,
      type_id: typeId,
      u_height: type?.default_u_height || 1,
      u_position: '',
    });
  };

  const handleRackChange = (e) => {
    setFormData({
      ...formData,
      rack_id: e.target.value,
      u_position: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanedData = {
      ...formData,
      type_id: formData.type_id ? parseInt(formData.type_id) : null,
      rack_id: formData.rack_id ? parseInt(formData.rack_id) : null,
      site_id: formData.site_id ? parseInt(formData.site_id) : null,
      u_position: formData.u_position ? parseInt(formData.u_position) : null,
      u_height: oltHeight,
      latitude: formData.latitude || null,
      longitude: formData.longitude || null,
    };
    await onSubmit(cleanedData);
  };

  return (
    <div className="olt-form-container">
      <div className="form-header">
        <h2>Add New OLT</h2>
        <button className="btn-close" onClick={onCancel}>×</button>
      </div>
      <form onSubmit={handleSubmit} className="site-form">
        <div className="form-row">
          <div className="form-group">
            <label>OLT Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              placeholder="e.g., OLT-01-SOLO"
            />
          </div>
          <div className="form-group">
            <label>OLT Type *</label>
            <select
              name="type_id"
              value={formData.type_id}
              onChange={handleTypeChange}
              required
            >
              <option value="">Select OLT Type</option>
              {oltTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.default_u_height || 1}U)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Site / POP *</label>
            <select
              name="site_id"
              value={formData.site_id}
              onChange={handleSiteChange}
              required
            >
              <option value="">Select Site / POP</option>
              {availableSites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.site_type})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Rack</label>
            <select
              name="rack_id"
              value={formData.rack_id}
              onChange={handleRackChange}
              disabled={!formData.site_id}
            >
              <option value="">{formData.site_id ? 'Select Rack' : 'Select Site First'}</option>
              {filteredRacks.map(rack => (
                <option key={rack.id} value={rack.id}>
                  {rack.name} ({rack.rack_height_u || 42}U)
                </option>
              ))}
            </select>
          </div>
        </div>

        {formData.rack_id && (
          <div className="form-row">
            <div className="form-group">
              <label>U Position * ({oltHeight}U device) {uniqueOccupiedPositions.length > 0 && <span style={{ color: '#ef4444', fontWeight: 'normal' }}>({uniqueOccupiedPositions.length} occupied)</span>}</label>
              <select
                name="u_position"
                value={formData.u_position}
                onChange={e => setFormData({...formData, u_position: e.target.value})}
                required
              >
                <option value="">Select U Position</option>
                {availableUPositions.map(u => (
                  <option key={u} value={u}>
                    U{u} - U{u + oltHeight - 1}
                  </option>
                ))}
              </select>
              {uniqueOccupiedPositions.length > 0 && (
                <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                  Occupied: {uniqueOccupiedPositions.map(u => `U${u}`).join(', ')}
                </small>
              )}
            </div>
          </div>
        )}
        )}

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary">Create OLT</button>
        </div>
      </form>
    </div>
  );
};

const OLTView = ({ olt, onBack, onRefresh, types, sites, racks, allInfrastructures }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [ports, setPorts] = useState([]);

  // Port modal state
  const [showPortModal, setShowPortModal] = useState(false);
  const [selectedPort, setSelectedPort] = useState(null);
  const [portFormData, setPortFormData] = useState({
    status: 'available',
    client_area: '',
    notes: '',
    connected_port_id: '',
    connection_type: 'fiber',
    cable_length_m: '',
    cable_label: '',
    id_odc: '',
  });
  const [otbList, setOtbList] = useState([]);
  const [selectedOtbPorts, setSelectedOtbPorts] = useState([]);

  const oltTypes = types.filter(t => t.category === 'olt');
  const availableSites = sites || [];
  const allRacks = racks || [];

  // Get the OLT type (from edit mode or from the OLT itself)
  const currentOltType = isEditing
    ? oltTypes.find(t => t.id === parseInt(editData.type_id))
    : olt.type;

  const portCount = olt.type?.default_ports || 16;

  // Get selected rack from all racks for edit mode
  const selectedEditRack = allRacks.find(r => r.id === parseInt(editData.rack_id));
  const editRackHeight = selectedEditRack?.rack_height_u || 42;

  // Filter racks based on selected site in edit mode for dropdown display
  const filteredRacks = editData.site_id
    ? allRacks.filter(r => r.site_id === parseInt(editData.site_id))
    : allRacks;

  // Get selected OLT type info for edit
  const selectedEditType = oltTypes.find(t => t.id === parseInt(editData.type_id));
  const editOltHeight = selectedEditType?.default_u_height || editData.u_height || 1;

  // Calculate available U positions for edit mode
  // Use allInfrastructures to include OLT, OTB, and other devices in the rack
  const occupiedEditData = (allInfrastructures || [])
    .filter(r => parseInt(r.rack_id) === parseInt(editData.rack_id) && r.id !== olt.id && r.u_position)
    .map(r => ({ u_position: r.u_position, u_height: r.u_height || 1 }));

  // Calculate all occupied U positions for edit mode (for display)
  const occupiedEditPositionsList = [];
  occupiedEditData.forEach(d => {
    for (let i = 0; i < d.u_height; i++) {
      occupiedEditPositionsList.push(d.u_position + i);
    }
  });
  const uniqueOccupiedEditPositions = [...new Set(occupiedEditPositionsList)].sort((a, b) => a - b);

  const availableEditUPositions = [];
  for (let u = 1; u <= editRackHeight - editOltHeight + 1; u++) {
    let canFit = true;
    for (let h = 0; h < editOltHeight; h++) {
      const pos = occupiedEditData.find(o => o.u_position === u + h);
      if (pos) {
        canFit = false;
        break;
      }
    }
    if (canFit) {
      availableEditUPositions.push(u);
    }
  }

  const handleEditTypeChange = (e) => {
    const typeId = e.target.value;
    const type = oltTypes.find(t => t.id === parseInt(typeId));
    setEditData({
      ...editData,
      type_id: typeId,
      u_height: type?.default_u_height || 1,
      u_position: '',
    });
  };

  useEffect(() => {
    loadPorts();
  }, [olt.id]);

  const loadPorts = async () => {
    try {
      const portsRes = await portService.getByInfrastructure(olt.id);
      setPorts(portsRes.data || []);
    } catch (error) {
      console.error('Error loading ports:', error);
    }
  };

  // Load OTB/ODP list for port connection
  useEffect(() => {
    if (showPortModal) {
      loadOtbList();
    }
  }, [showPortModal]);

  const loadOtbList = async () => {
    try {
      const res = await infrastructureService.getAll();
      // Only OTB (not ODP)
      const otbTypes = types.filter(t => t.category === 'otb');
      const otbTypeIds = otbTypes.map(t => t.id);
      const otbs = res.data.filter(i => otbTypeIds.includes(i.type_id));
      setOtbList(otbs);
    } catch (error) {
      console.error('Error loading OTB list:', error);
    }
  };

  const handlePortClick = (port) => {
    setSelectedPort(port);
    // Extract id_odc from notes if present
    let idOdc = '';
    let remainingNotes = port.notes || '';
    if (port.notes && port.notes.includes('ID ODC:')) {
      const match = port.notes.match(/ID ODC: ([^\n]+)/);
      if (match) {
        idOdc = match[1].trim();
        remainingNotes = port.notes.replace(/ID ODC: [^\n]+\n?/, '').trim();
      }
    }

    setPortFormData({
      status: port.status || 'available',
      client_area: port.client_area || '',
      notes: remainingNotes,
      connected_port_id: port.connected_port_id || '',
      connection_type: port.connection_type || 'fiber',
      cable_length_m: port.cable_length_m || '',
      cable_label: port.cable_label || '',
      id_odc: idOdc,
    });
    setShowPortModal(true);
  };

  const handleOtbChange = async (e) => {
    const otbId = e.target.value;
    setPortFormData({ ...portFormData, connected_port_id: '' });

    if (otbId) {
      try {
        const res = await portService.getByInfrastructure(otbId);
        setSelectedOtbPorts(res.data || []);
      } catch (error) {
        console.error('Error loading OTB ports:', error);
        setSelectedOtbPorts([]);
      }
    } else {
      setSelectedOtbPorts([]);
    }
  };

  const handleSavePort = async () => {
    try {
      // Update port basic info
      // Store id_odc in notes for now (can be separated later with migration)
      const notesWithOdc = portFormData.id_odc
        ? `ID ODC: ${portFormData.id_odc}${portFormData.notes ? '\n' + portFormData.notes : ''}`
        : portFormData.notes;

      await portService.update(selectedPort.id, {
        status: portFormData.status,
        client_area: portFormData.client_area,
        notes: notesWithOdc,
      });

      // If connecting to OTB port
      if (portFormData.connected_port_id) {
        await portService.connectPort(selectedPort.id, {
          connected_port_id: parseInt(portFormData.connected_port_id),
          connection_type: portFormData.connection_type,
          cable_length_m: portFormData.cable_length_m || null,
          cable_label: portFormData.cable_label || null,
        });
      } else if (selectedPort.connected_port_id) {
        // Disconnect if was connected
        await portService.disconnectPort(selectedPort.id);
      }

      setShowPortModal(false);
      loadPorts();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving port:', error);
      alert(error.response?.data?.message || 'Failed to save port');
    }
  };

  const handleEdit = () => {
    setEditData({
      type_id: olt.type_id || '',
      name: olt.name || '',
      rack_id: olt.rack_id || '',
      site_id: olt.site_id || '',
      u_position: olt.u_position || '',
      description: olt.description || '',
      status: olt.status || 'active',
    });
    setIsEditing(true);
  };

  const handleSiteChange = (e) => {
    setEditData({
      ...editData,
      site_id: e.target.value,
      rack_id: '',
      u_position: '',
    });
  };

  const handleRackChange = (e) => {
    setEditData({
      ...editData,
      rack_id: e.target.value,
      u_position: '',
    });
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete OLT "${olt.name}"?`)) return;

    try {
      await infrastructureService.delete(olt.id);
      onRefresh();
      onBack();
    } catch (error) {
      console.error('Error deleting OLT:', error);
      alert(error.response?.data?.message || 'Failed to delete OLT');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const cleanedData = {
        ...editData,
        type_id: editData.type_id ? parseInt(editData.type_id) : null,
        rack_id: editData.rack_id ? parseInt(editData.rack_id) : null,
        site_id: editData.site_id ? parseInt(editData.site_id) : null,
        u_position: editData.u_position ? parseInt(editData.u_position) : null,
        u_height: editOltHeight,
      };
      await infrastructureService.update(olt.id, cleanedData);
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating OLT:', error);
      alert(error.response?.data?.message || 'Failed to update OLT');
    }
  };

  const usedPorts = ports.filter(p => p.status === 'allocated' || p.is_connected).length;

  if (isEditing) {
    return (
      <div className="olt-form-container">
        <div className="form-header">
          <h2>Edit OLT</h2>
          <button className="btn-close" onClick={() => setIsEditing(false)}>×</button>
        </div>
        <form onSubmit={handleUpdate} className="site-form">
          <div className="form-row">
            <div className="form-group">
              <label>OLT Name *</label>
              <input
                type="text"
                name="name"
                value={editData.name}
                onChange={e => setEditData({...editData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>OLT Type *</label>
              <select
                name="type_id"
                value={editData.type_id}
                onChange={handleEditTypeChange}
                required
              >
                <option value="">Select OLT Type</option>
                {oltTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.default_u_height || 1}U)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Site / POP</label>
              <select
                name="site_id"
                value={editData.site_id}
                onChange={handleSiteChange}
              >
                <option value="">Select Site / POP</option>
                {availableSites.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.site_type})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Rack</label>
              <select
                name="rack_id"
                value={editData.rack_id}
                onChange={handleRackChange}
                disabled={!editData.site_id}
              >
                <option value="">{editData.site_id ? 'Select Rack' : 'Select Site First'}</option>
                {filteredRacks.map(rack => (
                  <option key={rack.id} value={rack.id}>
                    {rack.name} ({rack.rack_height_u || 42}U)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editData.rack_id && (
            <div className="form-row">
              <div className="form-group">
                <label>U Position ({editOltHeight}U device) {uniqueOccupiedEditPositions.length > 0 && <span style={{ color: '#ef4444', fontWeight: 'normal' }}>({uniqueOccupiedEditPositions.length} occupied)</span>}</label>
                <select
                  name="u_position"
                  value={editData.u_position}
                  onChange={e => setEditData({...editData, u_position: e.target.value})}
                >
                  <option value="">Select U Position</option>
                  {availableEditUPositions.map(u => (
                    <option key={u} value={u}>
                      U{u} - U{u + editOltHeight - 1}
                    </option>
                  ))}
                </select>
                {uniqueOccupiedEditPositions.length > 0 && (
                  <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                    Occupied: {uniqueOccupiedEditPositions.map(u => `U${u}`).join(', ')}
                  </small>
                )}
              </div>
            </div>
          )}

          <div className="form-row">
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
    <div className="olt-view">
      <div className="olt-view-header">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <h2><MemoryStick size={24} className="header-icon" /> {olt.name}</h2>
        <div className="olt-actions">
          <button className="btn btn-primary" onClick={handleEdit} title="Edit"><Pencil size={16} /> Edit</button>
          <button className="btn btn-danger" onClick={handleDelete} title="Delete"><Trash2 size={16} /> Delete</button>
        </div>
      </div>

      <div className="olt-info-grid">
        <div className="info-card">
          <h4>Ports ({portCount})</h4>
          {currentOltType?.port_groups > 1 ? (
            <div className="port-groups">
              {Array.from({length: currentOltType.port_groups}).map((_, groupIndex) => {
                const groupNum = groupIndex + 1;
                return (
                  <div key={groupIndex} className="port-group">
                    <div className="port-group-header">GTGH {groupNum}</div>
                    <div className="port-group-ports">
                      {Array.from({length: currentOltType.ports_per_group}).map((_, portIndex) => {
                        const portNum = portIndex + 1;
                        const port = ports.find(p => {
                          const match = p.name?.match(/1\/\d+\/(\d+)/);
                          return match && parseInt(match[1]) === portNum;
                        });
                        const isUsed = port && (port.status === 'allocated' || port.is_connected);
                        const portName = port?.name || `PON 1/${groupNum}/${portNum}`;

                        return (
                          <div
                            key={portIndex}
                            className={`port-slot ${isUsed ? 'occupied' : 'available'}`}
                            title={portName}
                            onClick={() => handlePortClick(port)}
                            style={{ cursor: 'pointer' }}
                          >
                            {portName.replace(/^PON /, '')}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="port-visual">
              {Array.from({length: portCount}).map((_, i) => {
                const port = ports.find(p => p.port_number === i + 1);
                const isUsed = port && (port.status === 'allocated' || port.is_connected);
                const portName = port?.name || `PON-${i + 1}`;
                return (
                  <div
                    key={i}
                    className={`port-slot ${isUsed ? 'occupied' : 'available'}`}
                    title={portName}
                    onClick={() => handlePortClick(port)}
                    style={{ cursor: 'pointer' }}
                  >
                    {portName}
                  </div>
                );
              })}
            </div>
          )}
          <p>{usedPorts} / {portCount} used</p>
        </div>

        <div className="info-card">
          <h4>OLT Information</h4>
          <div className="info-row">
            <span className="info-label">Type:</span>
            <span className="info-value">{olt.type?.name || '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Site:</span>
            <span className="info-value">{olt.site?.name || '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Rack:</span>
            <span className="info-value">{olt.rack?.name || '-'}{olt.u_position ? ` (U${olt.u_position})` : ''}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className={`status-badge ${olt.status}`}>{olt.status}</span>
          </div>
          {olt.description && (
            <div className="info-row">
              <span className="info-label">Description:</span>
              <span className="info-value">{olt.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Port Edit Modal */}
      {showPortModal && selectedPort && (
        <div className="modal-overlay" onClick={() => setShowPortModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Port: {selectedPort.name}</h3>
              <button className="close-btn" onClick={() => setShowPortModal(false)}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={portFormData.status}
                  onChange={e => setPortFormData({ ...portFormData, status: e.target.value })}
                >
                  <option value="available">Available</option>
                  <option value="allocated">Allocated</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="form-group">
                <label>Area / Desa</label>
                <input
                  type="text"
                  value={portFormData.client_area}
                  onChange={e => setPortFormData({ ...portFormData, client_area: e.target.value })}
                  placeholder="Desa / kelurahan / area"
                />
              </div>

              <div className="form-group">
                <label>Connect to OTB</label>
                <select value="" onChange={handleOtbChange}>
                  <option value="">-- Select OTB --</option>
                  {otbList.filter(otb => {
                    const otbType = types.find(t => t.id === otb.type_id);
                    return otbType?.category === 'otb';
                  }).map(otb => (
                    <option key={otb.id} value={otb.id}>{otb.name}</option>
                  ))}
                </select>
              </div>

              {selectedOtbPorts.length > 0 && (
                <div className="form-group">
                  <label>OTB Port</label>
                  <select
                    value={portFormData.connected_port_id}
                    onChange={e => setPortFormData({ ...portFormData, connected_port_id: e.target.value })}
                  >
                    <option value="">-- Select Port --</option>
                    {selectedOtbPorts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name || `Port ${p.port_number}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>ID ODC</label>
                <input
                  type="text"
                  value={portFormData.id_odc || ''}
                  onChange={e => setPortFormData({ ...portFormData, id_odc: e.target.value })}
                  placeholder="ID ODC terkait"
                />
              </div>

              {portFormData.connected_port_id && (
                <>
                  <div className="form-group">
                    <label>Connection Type</label>
                    <select
                      value={portFormData.connection_type}
                      onChange={e => setPortFormData({ ...portFormData, connection_type: e.target.value })}
                    >
                      <option value="fiber">Fiber</option>
                      <option value="copper">Copper</option>
                      <option value="wireless">Wireless</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Cable Length (m)</label>
                    <input
                      type="number"
                      value={portFormData.cable_length_m}
                      onChange={e => setPortFormData({ ...portFormData, cable_length_m: e.target.value })}
                      placeholder="Panjang kabel"
                    />
                  </div>

                  <div className="form-group">
                    <label>Cable Label</label>
                    <input
                      type="text"
                      value={portFormData.cable_label}
                      onChange={e => setPortFormData({ ...portFormData, cable_label: e.target.value })}
                      placeholder="Label kabel"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={portFormData.notes}
                  onChange={e => setPortFormData({ ...portFormData, notes: e.target.value })}
                  placeholder="Catatan tambahan"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPortModal(false)}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSavePort}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OLTManager;
