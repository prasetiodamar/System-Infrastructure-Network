import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { infrastructureService, infrastructureTypeService, portService, spliceService } from '../services/services';
import InfrastructureForm from './InfrastructureForm';
import PortManager from './PortManager';
import SpliceManager from './SpliceManager';
import MapComponent from './MapComponent';
import {
  GalleryThumbnails,
  Microchip,
  NotebookTabs,
  Notebook,
  Server,
  Router,
  Network,
  Flag,
  Building,
  Building2,
  Plus,
  MapPin,
  Pencil,
  Trash2,
  MemoryStick,
  Search,
  Container,
  KeyboardMusic,
  Eye,
  Upload,
  Image,
  Link,
  User,
  Box
} from 'lucide-react';
import './InfrastructureView.css';

const InfrastructureView = ({ typeName }) => {
  const [infrastructures, setInfrastructures] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPortManager, setShowPortManager] = useState(false);
  const [showSpliceManager, setShowSpliceManager] = useState(false);
  const [selectedInfrastructure, setSelectedInfrastructure] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [preSelectedTypeId, setPreSelectedTypeId] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState('all'); // For OTB sub-types filtering
  const [searchTerm, setSearchTerm] = useState(''); // For search functionality
  const [splices, setSplices] = useState([]); // For client name search
  const [uploadingImage, setUploadingImage] = useState(null); // Track which infra is uploading
  const [showImageModal, setShowImageModal] = useState(null); // Track which infra's image to view

  const typeConfig = {
    'pop': { icon: MapPin, color: '#4CAF50', title: 'POP', nameFilter: 'POP' },
    'data-center': { icon: Container, color: '#9C27B0', title: 'Data Center', nameFilter: 'data center' },
    'otb': { icon: GalleryThumbnails, color: '#2196F3', title: 'OTB', nameFilter: 'OTB' },
    'joint-box': { icon: Microchip, color: '#E65100', title: 'Joint Box', nameFilter: 'Joint' },
    'odc': { icon: NotebookTabs, color: '#9C27B0', title: 'ODC', nameFilter: 'ODC' },
    'odp': { icon: Notebook, color: '#00BCD4', title: 'ODP', nameFilter: 'ODP' },
    'server': { icon: Server, color: '#3F51B5', title: 'Server', nameFilter: 'Server' },
    'router': { icon: Router, color: '#009688', title: 'Router', nameFilter: 'Router' },
    'switch': { icon: KeyboardMusic, color: '#FF5722', title: 'Switch', nameFilter: 'Switch' },
    'tiang': { icon: Flag, color: '#795548', title: 'Tiang', nameFilter: 'Tiang' },
    'olt': { icon: MemoryStick, color: '#00BCD4', title: 'OLT', nameFilter: 'OLT' },
  };

  const config = typeConfig[typeName] || { icon: Building, color: '#667eea', title: typeName, nameFilter: typeName };

  // Get OTB sub-types for filtering
  const getOtbSubTypes = () => {
    if (typeName !== 'otb') return [];
    const otbTypes = types.filter(t => t.name.toLowerCase().includes('otb'));
    return otbTypes.sort((a, b) => {
      // Sort by port number: 12, 24, 48, 96
      const portA = parseInt(a.name.match(/\d+/)?.[0] || 0);
      const portB = parseInt(b.name.match(/\d+/)?.[0] || 0);
      return portA - portB;
    });
  };

  const otbSubTypes = getOtbSubTypes();

  useEffect(() => {
    loadTypes();
  }, []);

  // Auto-refresh splices when switching to Joint Box menu
  useEffect(() => {
    loadSplicesForSearch();
  }, [typeName]);

  // Listen for splice updates from SpliceManager
  useEffect(() => {
    const handleSpliceUpdated = () => {
      loadSplicesForSearch();
    };
    window.addEventListener('splice-updated', handleSpliceUpdated);
    return () => window.removeEventListener('splice-updated', handleSpliceUpdated);
  }, []);

  // Load splices for client name search
  const loadSplicesForSearch = async () => {
    try {
      // Get all splices to search by client name
      const res = await spliceService.getAll();
      setSplices(res.data);
    } catch (error) {
      console.error('Error loading splices for search:', error);
    }
  };

  useEffect(() => {
    if (types.length > 0) {
      loadInfrastructures();
    }
  }, [types, typeName, selectedSubType, splices]);

  const loadTypes = async () => {
    try {
      const res = await infrastructureTypeService.getAll();
      setTypes(res.data);
    } catch (error) {
      console.error('Error loading types:', error);
    }
  };

  const loadInfrastructures = async () => {
    try {
      setLoading(true);
      const res = await infrastructureService.getAll();
      let filtered = res.data.filter(infra => {
        const infraTypeName = infra.type?.name?.toLowerCase() || '';
        return infraTypeName.toLowerCase().includes(config.nameFilter.toLowerCase());
      });

      // Additional filtering for OTB sub-types
      if (typeName === 'otb' && selectedSubType !== 'all') {
        const selectedType = otbSubTypes.find(t => t.id.toString() === selectedSubType);
        if (selectedType) {
          filtered = filtered.filter(infra => infra.type_id === selectedType.id);
        }
      }

      // Search filtering - enhanced to include more fields and client names with chain
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(infra => {
          // Check direct infrastructure fields
          const directMatch =
            infra.name?.toLowerCase().includes(searchLower) ||
            infra.address?.toLowerCase().includes(searchLower) ||
            infra.latitude?.toString().includes(searchLower) ||
            infra.longitude?.toString().includes(searchLower) ||
            infra.notes?.toLowerCase().includes(searchLower) ||
            infra.type?.name?.toLowerCase().includes(searchLower) ||
            infra.id?.toString().includes(searchLower);

          if (directMatch) return true;

          // Check client names - follow the full splice chain
          const infraId = infra.id;

          // 1. Splices at this infrastructure (Joint Box)
          const splicesAtInfra = splices.filter(s =>
            Number(s.joint_box_infrastructure_id) === Number(infraId)
          );

          // 2. Splices from this OTB (source)
          const splicesFromThisOTB = splices.filter(s =>
            Number(s.source_otb_id) === Number(infraId)
          );

          // Combine splices
          const allRelatedSplices = [...splicesAtInfra, ...splicesFromThisOTB];

          const clientMatch = allRelatedSplices.some(s =>
            s.client_name?.toLowerCase().includes(searchLower) ||
            s.client_area?.toLowerCase().includes(searchLower)
          );

          return clientMatch;
        });
      }

      setInfrastructures(filtered);
    } catch (error) {
      console.error('Error loading infrastructures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    let typeIdToUse = null;

    if (typeName === 'otb') {
      if (selectedSubType !== 'all') {
        // Use the selected sub-type (12 Port, 24 Port, etc.)
        typeIdToUse = parseInt(selectedSubType);
      }
      // If on "All OTB" tab, don't pre-select - let user choose from dropdown
    } else {
      // For non-OTB types, find the matching type
      const matchingType = types.find(t => t.name.toLowerCase().includes(config.nameFilter.toLowerCase()));
      typeIdToUse = matchingType?.id;
    }

    if (typeIdToUse) {
      setEditingId(null);
      setPreSelectedTypeId(typeIdToUse);
      setShowForm(true);
    } else if (typeName === 'otb' && selectedSubType === 'all') {
      // For OTB "All" tab, show form without pre-selecting type
      setEditingId(null);
      setPreSelectedTypeId(null);
      setShowForm(true);
    } else {
      alert(`No infrastructure type found for ${config.title}`);
    }
  };

  const handleEdit = (infra) => {
    setEditingId(infra.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this infrastructure?')) {
      try {
        await infrastructureService.delete(id);
        setInfrastructures(infrastructures.filter(i => i.id !== id));
        loadInfrastructures();
      } catch (error) {
        console.error('Error deleting:', error);
        alert('Failed to delete infrastructure');
      }
    }
  };

  const handleImageUpload = async (infraId, event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(infraId);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images[]', files[i]);
    }

    try {
      const response = await infrastructureService.uploadImage(infraId, formData);
      const infra = infrastructures.find(i => i.id === infraId);
      const existingImages = infra?.images || [];
      const newImages = [...existingImages, ...response.data.images];
      setInfrastructures(infrastructures.map(infra =>
        infra.id === infraId
          ? { ...infra, images: newImages }
          : infra
      ));
      loadInfrastructures();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (infraId, index) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      await infrastructureService.deleteImage(infraId, index);
      const updatedInfras = infrastructures.map(infra =>
        infra.id === infraId
          ? { ...infra, images: infra.images.filter((_, i) => i !== index) }
          : infra
      );
      setInfrastructures(updatedInfras);
      // Update modal to reflect changes immediately
      if (showImageModal) {
        const updatedModalInfra = updatedInfras.find(infra => infra.id === infraId);
        if (updatedModalInfra) {
          setShowImageModal(updatedModalInfra);
        }
      }
      loadInfrastructures();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const handleImageDownload = async (infraId, index) => {
    try {
      const response = await infrastructureService.downloadImage(infraId, index);
      const infra = infrastructures.find(i => i.id === infraId);
      const imageName = infra?.images?.[index]?.name || 'image';
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

  const handleManagePorts = (infra) => {
    setSelectedInfrastructure(infra);
    setShowPortManager(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingId(null);
    setPreSelectedTypeId(null);
    loadInfrastructures();
  };

  const handleSubTypeChange = (subTypeId) => {
    setSelectedSubType(subTypeId);
  };

  const handleViewOnMap = (infra) => {
    setSelectedInfrastructure(infra);
    setShowMap(true);
  };

  const HeaderIcon = config.icon;

  if (showForm) {
    return (
      <div className="infrastructure-view">
        <div className="manager-header">
          <h2><HeaderIcon size={24} className="header-icon" /> {editingId ? `Edit ${config.title}` : `Add New ${config.title}`}</h2>
          <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); setPreSelectedTypeId(null); }}>
            ← Back to {config.title}
          </button>
        </div>
        <InfrastructureForm
          onSave={handleFormSave}
          onCancel={() => { setShowForm(false); setEditingId(null); setPreSelectedTypeId(null); }}
          editingId={editingId}
          preSelectedTypeId={preSelectedTypeId}
          typeName={typeName}
        />
      </div>
    );
  }

  return (
    <div className="infrastructure-view">
      <div className="manager-header">
        <h2><HeaderIcon size={24} className="header-icon" /> {config.title} Management</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          <Plus size={18} /> Add {config.title}
        </button>
      </div>

      {/* OTB Sub-types Tabs */}
      {typeName === 'otb' && otbSubTypes.length > 0 && (
        <div className="otb-subtypes-tabs">
          <button
            className={`subtype-tab ${selectedSubType === 'all' ? 'active' : ''}`}
            onClick={() => handleSubTypeChange('all')}
          >
            <GalleryThumbnails size={16} />
            All OTB ({infrastructures.length})
          </button>
          {otbSubTypes.map((type) => {
            const count = infrastructures.filter(i => i.type_id === type.id).length;
            const portMatch = type.name.match(/(\d+)\s*Port/);
            const portNum = portMatch ? portMatch[1] : '';
            return (
              <button
                key={type.id}
                className={`subtype-tab ${selectedSubType === type.id.toString() ? 'active' : ''}`}
                onClick={() => handleSubTypeChange(type.id.toString())}
              >
                <GalleryThumbnails size={16} />
                {portNum ? `${portNum} Port` : type.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Search Bar - placed inside view-content for joint-box */}
      {typeName !== 'joint-box' && (
      <div className="filter-bar" style={{ background: 'white', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
        <div className="filter-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={`Search by name, address, notes, type, client...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              loadSplicesForSearch();
              loadInfrastructures();
            }}
          />
        </div>
        {searchTerm && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm('');
              loadInfrastructures();
            }}
          >
            Clear
          </button>
        )}
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {infrastructures.length} {config.title}{infrastructures.length !== 1 ? 's' : ''}
        </span>
      </div>
      )}

      <div className="view-content">
        {/* Search Bar - inside view-content for joint-box */}
        {typeName === 'joint-box' && (
        <div className="filter-bar" style={{ background: 'white', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <div className="filter-search">
            <Search size={16} />
            <input
              type="text"
              placeholder={`Search by name, address, notes, type, client...`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                loadSplicesForSearch();
                loadInfrastructures();
              }}
            />
          </div>
          {searchTerm && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearchTerm('');
                loadInfrastructures();
              }}
            >
              Clear
            </button>
          )}
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {infrastructures.length} {config.title}{infrastructures.length !== 1 ? 's' : ''}
          </span>
        </div>
        )}

        {loading ? (
          <div className="loading">Loading {config.title}...</div>
        ) : infrastructures.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-container">
              <HeaderIcon size={64} color={config.color} />
            </div>
            <h3>No {config.title} Found</h3>
            <p>Get started by adding your first {config.title} infrastructure.</p>
            <button className="add-btn-empty" onClick={handleAdd}>
              <Plus size={18} />
              Add First {config.title}
            </button>
          </div>
        ) : (
          <div className="olts-grid">
            {infrastructures.map((infra) => {
              return (
              /* Modern Card for All Infrastructure Types */
              <div
                key={infra.id}
                className="olt-card"
                style={{
                  '--card-color': config.color,
                  '--card-color-light': config.color + '99',
                  '--badge-color': config.color,
                  '--badge-color-dark': config.color
                }}
              >
                <div className="olt-card-content">
                  <div className="olt-header">
                    <h3>{infra.name}</h3>
                    <span className="olt-type-badge">
                      {infra.type?.name || config.title}
                    </span>
                  </div>
                  <div className="olt-body">
                    <div className="olt-stat">
                      <Network size={15} />
                      <span>{infra.type?.name || config.title}</span>
                    </div>
                    {infra.latitude && infra.longitude && (
                      <div className="olt-site-location">
                        <MapPin size={14} />
                        <span>{parseFloat(infra.latitude).toFixed(5)}, {parseFloat(infra.longitude).toFixed(5)}</span>
                      </div>
                    )}
                    {infra.site && (
                      <div className="olt-rack-location">
                        <Building2 size={14} />
                        <span>{infra.site.name}</span>
                      </div>
                    )}
                    {infra.address && (
                      <div className="olt-site-location">
                        <span style={{ fontSize: '12px' }}>{infra.address}</span>
                      </div>
                    )}
                    {/* Check if ODP - show port info instead of splices */}
                    {infra.type?.name?.toLowerCase().includes('odp') ? (
                      <div className="splice-link" onClick={() => { setSelectedInfrastructure(infra); setShowPortManager(true); }}>
                        <Box size={14} />
                        <span>{infra.ports_count || 0} Ports - {infra.customers_count || 0} Pelanggan</span>
                      </div>
                    ) : (
                      <div className="splice-link" onClick={() => { setSelectedInfrastructure(infra); setShowSpliceManager(true); }}>
                        <Link size={14} />
                        <span>{infra.splices_count || 0} Splices - Click to manage</span>
                      </div>
                    )}
                  </div>
                  <div className="card-actions">
                    <button className="btn btn-secondary" onClick={() => handleViewOnMap(infra)}>
                      <MapPin size={12} /> Map
                    </button>
                    {(config.nameFilter.toLowerCase().includes('otb') || config.nameFilter.toLowerCase().includes('odc') || config.nameFilter.toLowerCase().includes('odp')) && (
                      <button className="btn btn-secondary" onClick={() => handleManagePorts(infra)}>
                        <MemoryStick size={12} /> Ports
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => handleEdit(infra)}>
                      <Pencil size={12} /> Edit
                    </button>
                    {infra.images?.length > 0 ? (
                      <button
                        className="btn"
                        onClick={() => setShowImageModal(infra)}
                        style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #f59e0b' }}
                      >
                        <Image size={12} /> ({infra.images.length})
                      </button>
                    ) : (
                      <label className="btn" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #10b981', cursor: 'pointer' }}>
                        <Upload size={12} /> Photo
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageUpload(infra.id, e)}
                          disabled={uploadingImage === infra.id}
                        />
                      </label>
                    )}
                    <button className="btn btn-danger" onClick={() => handleDelete(infra.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
);
            })}
          </div>
        )}
      </div>

      {showPortManager && selectedInfrastructure && (
        <div className="modal-overlay" onClick={() => setShowPortManager(false)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowPortManager(false)}>
              ×
            </button>
            <PortManager
              infrastructure={selectedInfrastructure}
              onClose={() => setShowPortManager(false)}
            />
          </div>
        </div>
      )}

      {showSpliceManager && selectedInfrastructure && (
        <div className="modal-overlay" onClick={() => setShowSpliceManager(false)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <SpliceManager
              jointBox={selectedInfrastructure}
              onClose={() => setShowSpliceManager(false)}
            />
          </div>
        </div>
      )}

      {showMap && selectedInfrastructure && (
        <div className="modal-overlay" onClick={() => setShowMap(false)}>
          <div className="modal-content map-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowMap(false)}>
              ×
            </button>
            <MapComponent targetLocation={{ lat: selectedInfrastructure.latitude, lng: selectedInfrastructure.longitude, name: selectedInfrastructure.name }} />
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', padding: '20px' }}>
            <button
              style={{ position: 'absolute', top: '8px', right: '8px', background: '#f3f4f6', border: 'none', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: '#4b5563', padding: '6px 12px', borderRadius: '6px' }}
              onClick={() => setShowImageModal(null)}
            >
              Tutup
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
              Dokumentasi - {showImageModal.name}
            </h3>
            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
              {showImageModal.type?.name || 'Infrastructure'} - {(showImageModal.images || []).length} gambar
            </div>

            {/* Multiple Images Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '12px',
              maxHeight: '50vh',
              overflowY: 'auto',
              marginBottom: '16px'
            }}>
              {(showImageModal.images || []).map((img, idx) => (
                <div key={idx} style={{ position: 'relative', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  <img
                    src={`http://localhost:8000/storage/${img.path}`}
                    alt={img.name || 'Image'}
                    style={{ width: '100%', height: '120px', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => handleImageDownload(showImageModal.id, idx)}
                  />
                  <div style={{ padding: '8px', background: '#f9fafb' }}>
                    <div style={{ fontSize: '10px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.name}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button
                        onClick={() => handleImageDownload(showImageModal.id, idx)}
                        style={{ flex: 1, padding: '4px', fontSize: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleImageDelete(showImageModal.id, idx)}
                        style={{ flex: 1, padding: '4px', fontSize: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Images */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <label
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {uploadingImage === showImageModal.id ? 'Uploading...' : 'Tambah Foto'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    handleImageUpload(showImageModal.id, e);
                    setShowImageModal(null);
                  }}
                  disabled={uploadingImage === showImageModal.id}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfrastructureView;
