import React, { useState, useEffect } from 'react';
import { infrastructureService, infrastructureTypeService, spliceService, siteService } from '../services/services';
import OTBForm from './OTBForm';
import PortManager from './PortManager';
import SpliceManager from './SpliceManager';
import {
  GalleryThumbnails,
  Plus,
  Pencil,
  Trash2,
  Search,
  Link,
  Eye,
  MapPin,
  Upload,
  Image
} from 'lucide-react';
import './OLTManager.css';

const OTBList = () => {
  const [infrastructures, setInfrastructures] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPortManager, setShowPortManager] = useState(false);
  const [selectedInfrastructure, setSelectedInfrastructure] = useState(null);
  const [preSelectedTypeId, setPreSelectedTypeId] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [sites, setSites] = useState([]);
  const [splices, setSplices] = useState([]);
  const [showSpliceManager, setShowSpliceManager] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(null);

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    if (types.length > 0) {
      loadInfrastructures();
    }
  }, [types, selectedSubType, splices]);

  // Load splices for client name search
  const loadSplicesForSearch = async () => {
    try {
      const res = await spliceService.getAll();
      setSplices(res.data);
    } catch (error) {
      console.error('Error loading splices:', error);
    }
  };

  // Auto-refresh splices when component mounts
  useEffect(() => {
    loadSplicesForSearch();
  }, []);

  // Listen for splice updates from SpliceManager
  useEffect(() => {
    const handleSpliceUpdated = () => {
      loadSplicesForSearch();
    };
    window.addEventListener('splice-updated', handleSpliceUpdated);
    return () => window.removeEventListener('splice-updated', handleSpliceUpdated);
  }, []);

  const loadTypes = async () => {
    try {
      const [typesRes, sitesRes] = await Promise.all([
        infrastructureTypeService.getAll(),
        siteService.getAll()
      ]);
      setTypes(typesRes.data);
      setSites(sitesRes.data);
    } catch (error) {
      console.error('Error loading types:', error);
    }
  };

  const loadInfrastructures = async () => {
    try {
      setLoading(true);
      const res = await infrastructureService.getAll();
      // Filter only OTB types
      let filtered = res.data.filter(infra => {
        const infraTypeName = infra.type?.name?.toLowerCase() || '';
        return infraTypeName.includes('otb');
      });

      // Additional filtering for OTB sub-types
      if (selectedSubType !== 'all') {
        filtered = filtered.filter(infra => infra.type_id === parseInt(selectedSubType));
      }

      // Filter by site
      if (selectedSite) {
        filtered = filtered.filter(infra => infra.site_id === parseInt(selectedSite));
      }

      // Search filtering - include client names from splices
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

          // Check client names from splices where this OTB is the source (cable originates from this OTB)
          const splicesFromThisOTB = splices.filter(s =>
            Number(s.source_otb_id) === Number(infra.id)
          );

          // Check client names from splices at this infrastructure
          const splicesAtInfra = splices.filter(s =>
            Number(s.joint_box_infrastructure_id) === Number(infra.id)
          );

          // Combine: splices from this OTB + splices at this infrastructure
          const combinedSplices = [...splicesFromThisOTB, ...splicesAtInfra];

          const clientMatch = combinedSplices.some(s =>
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

  const handleAdd = (subTypeId = null) => {
    setEditingId(null);
    setPreSelectedTypeId(subTypeId);
    setShowForm(true);
  };

  const handleEdit = (infra) => {
    setEditingId(infra.id);
    setPreSelectedTypeId(infra.type_id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this OTB?')) {
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

  const handleManagePorts = (infra) => {
    setSelectedInfrastructure(infra);
    setShowPortManager(true);
  };

  const handleImageUpload = async (infraId, e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(infraId);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images[]', files[i]);
    }

    try {
      const response = await infrastructureService.uploadImage(infraId, formData);
      const infraIdNum = parseInt(infraId);
      const infra = infrastructures.find(i => parseInt(i.id) === infraIdNum);
      const existingImages = infra?.images || [];
      const newImages = [...existingImages, ...response.data.images];
      setInfrastructures(infrastructures.map(infra =>
        parseInt(infra.id) === infraIdNum ? { ...infra, images: newImages } : infra
      ));
      loadInfrastructures();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (infraId, index) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await infrastructureService.deleteImage(infraId, index);
      const infraIdNum = parseInt(infraId);
      const updatedInfras = infrastructures.map(infra =>
        parseInt(infra.id) === infraIdNum
          ? { ...infra, images: infra.images.filter((_, i) => i !== index) }
          : infra
      );
      setInfrastructures(updatedInfras);
      // Update modal to reflect changes immediately
      if (showImageModal) {
        const updatedModalInfra = updatedInfras.find(infra => parseInt(infra.id) === infraIdNum);
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
      const infraIdNum = parseInt(infraId);
      const infra = infrastructures.find(i => parseInt(i.id) === infraIdNum);
      const imageName = infra?.images?.[index]?.name || 'image';
      const response = await infrastructureService.downloadImage(infraId, index);
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

  const handleFormSave = () => {
    setShowForm(false);
    setEditingId(null);
    setPreSelectedTypeId(null);
    loadInfrastructures();
  };

  const getOtbSubTypes = () => {
    const otbTypes = types.filter(t => t.name.toLowerCase().includes('otb'));
    return otbTypes.sort((a, b) => {
      const portA = parseInt(a.name.match(/\d+/)?.[0] || 0);
      const portB = parseInt(b.name.match(/\d+/)?.[0] || 0);
      return portA - portB;
    });
  };

  const otbSubTypes = getOtbSubTypes();

  if (showForm) {
    return (
      <div className="olt-form-container">
        <OTBForm
          onSave={handleFormSave}
          onCancel={() => { setShowForm(false); setEditingId(null); setPreSelectedTypeId(null); }}
          editingId={editingId}
          preSelectedTypeId={preSelectedTypeId}
        />
      </div>
    );
  }

  return (
    <div className="olt-manager">
      <div className="manager-header">
        <h2><GalleryThumbnails size={20} className="header-icon" /> OTB Management</h2>
        <button className="btn btn-primary" onClick={() => handleAdd()}>
          <Plus size={16} /> Add OTB
        </button>
      </div>

      {/* Search and Filter */}
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, address, notes, type, client..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              loadSplicesForSearch();
              loadInfrastructures();
            }}
          />
        </div>
        <select
          value={selectedSite}
          onChange={(e) => {
            setSelectedSite(e.target.value);
            loadInfrastructures();
          }}
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
              loadInfrastructures();
            }}
          >
            Clear
          </button>
        )}
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {infrastructures.length} OTB{infrastructures.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* OTB Sub-types Tabs */}
      <div className="category-tabs">
        <button
          className={`tab ${selectedSubType === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedSubType('all')}
        >
          All ({infrastructures.length})
        </button>
        {otbSubTypes.map((type) => {
          const count = infrastructures.filter(i => i.type_id === type.id).length;
          return (
            <button
              key={type.id}
              className={`tab ${selectedSubType === type.id.toString() ? 'active' : ''}`}
              onClick={() => setSelectedSubType(type.id.toString())}
            >
              {type.name} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="loading">Loading OTB...</div>
      ) : infrastructures.length === 0 ? (
        <div className="empty-state">
          <GalleryThumbnails size={64} />
          <h3>No OTB Found</h3>
          <p>Create your first OTB to manage your network</p>
          <button className="btn btn-primary" onClick={() => handleAdd()}>
            + Create OTB
          </button>
        </div>
      ) : (
        <div className="olts-grid">
          {infrastructures.map((infra) => (
            <div key={infra.id} className="olt-card">
              <div className="olt-card-content">
                <div className="olt-header">
                  <h3>{infra.name}</h3>
                  <span className="olt-type-badge">
                    {infra.type?.name || 'OTB'}
                  </span>
                </div>
                <div className="olt-body">
                  <div className="olt-stat">
                    <GalleryThumbnails size={14} />
                    <span>{infra.type?.name || 'OTB'}</span>
                  </div>
                  <div className="olt-rack-location">
                    {infra.rack && <span>Rack: {infra.rack.name}</span>}
                    {infra.u_position && <span> (U{infra.u_position})</span>}
                  </div>
                  <div className="olt-site-location">
                    {infra.site && <span> {infra.site.name}</span>}
                  </div>
                  <div className="olt-ports-info" onClick={() => handleManagePorts(infra)}>
                    {infra.ports_count || 0} ports - Click to manage
                  </div>
                  <div style={{ cursor: 'pointer', color: '#f97316', marginTop: '8px', fontSize: '11px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => { setSelectedInfrastructure(infra); setShowSpliceManager(true); }}>
                    <Link size={12} /> Manage Splices
                  </div>
                </div>
              </div>
              <div className="card-actions">
                <button
                  className="btn btn-secondary"
                  style={{ flex: '1 1 auto', padding: '6px 10px', fontSize: '11px' }}
                  onClick={(e) => { e.stopPropagation(); handleEdit(infra); }}
                >
                  <Pencil size={12} /> Edit
                </button>
                {/* Combined Image/Photo button */}
                {infra.images?.length > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowImageModal(infra); }}
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
                    <Image size={12} /> ({infra.images.length})
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
                      onChange={(e) => { e.stopPropagation(); handleImageUpload(infra.id, e); }}
                      disabled={uploadingImage === infra.id}
                    />
                  </label>
                )}
                <button
                  className="btn"
                  style={{ flex: '1 1 auto', padding: '6px 10px', fontSize: '11px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2' }}
                  onClick={(e) => { e.stopPropagation(); handleDelete(infra.id); }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            <button className="close-modal-btn" onClick={() => setShowSpliceManager(false)}>
              ×
            </button>
            <SpliceManager
              jointBox={selectedInfrastructure}
              onClose={() => setShowSpliceManager(false)}
            />
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <button className="close-modal-btn" onClick={() => setShowImageModal(null)}>×</button>
            <h3 style={{ margin: '0 0 15px 0' }}>{showImageModal.type?.name || 'Infrastructure'} - {(showImageModal.images || []).length} gambar</h3>
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

export default OTBList;
