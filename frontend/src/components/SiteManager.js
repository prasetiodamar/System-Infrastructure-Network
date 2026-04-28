import React, { useState, useEffect } from 'react';
import { siteService } from '../services/services';
import { MapPin, Container, Pencil, Trash2, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, List } from 'lucide-react';
import './SiteManager.css';

const SiteManager = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      setLoading(true);
      const response = await siteService.getAll();
      setSites(response.data);
    } catch (error) {
      console.error('Error loading sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSite(null);
    setShowForm(true);
  };

  const handleEdit = (site) => {
    setEditingSite(site);
    setShowForm(true);
  };

  const handleDelete = async (siteId) => {
    if (!window.confirm('Are you sure you want to delete this site?')) return;

    try {
      await siteService.delete(siteId);
      loadSites();
    } catch (error) {
      console.error('Error deleting site:', error);
      alert(error.response?.data?.message || 'Failed to delete site');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSite(null);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingSite(null);
    loadSites();
  };

  const getSiteTypeBadge = (type) => {
    const badges = {
      'pop': 'badge-pop',
      'exchange': 'badge-exchange',
      'datacenter': 'badge-datacenter',
      'tower': 'badge-tower',
      'building': 'badge-building',
    };
    return badges[type] || 'badge-default';
  };

  const getSiteTypeIcon = (type) => {
    if (type === 'datacenter') return <Container size={20} />;
    if (type === 'pop') return <MapPin size={20} />;
    return <MapPin size={20} />;
  };

  // Filter sites based on search and type selection
  const filteredSites = sites.filter(site => {
    // Filter by site type
    if (selectedType && site.site_type !== selectedType) {
      return false;
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        site.name?.toLowerCase().includes(searchLower) ||
        site.code?.toLowerCase().includes(searchLower) ||
        site.address?.toLowerCase().includes(searchLower) ||
        site.site_type?.toLowerCase().includes(searchLower) ||
        site.latitude?.toString().includes(searchLower) ||
        site.longitude?.toString().includes(searchLower) ||
        site.notes?.toLowerCase().includes(searchLower) ||
        site.id?.toString().includes(searchLower)
      );
    }
    return true;
  }).sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (sortOrder === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  if (showForm) {
    return (
      <div className="site-manager">
        <SiteForm
          site={editingSite}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      </div>
    );
  }

  return (
    <div className="site-manager">
      <div className="manager-header">
        <h2><MapPin size={24} className="header-icon" /> Sites Management</h2>
        <div className="header-actions">
          <button
            className={`btn-view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={`btn-view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List size={18} />
          </button>
          <button className="btn btn-add" onClick={handleAdd}>
            + Add New Site
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search sites by name, code, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="pop">POP</option>
          <option value="datacenter">Data Center</option>
          <option value="exchange">Exchange</option>
          <option value="tower">Tower</option>
          <option value="building">Building</option>
        </select>
        <button
          className={`btn-sort ${sortOrder ? 'active' : ''}`}
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          title={sortOrder === 'asc' ? 'Sort A-Z' : 'Sort Z-A'}
        >
          {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </button>
        {(searchTerm || selectedType) && (
          <button
            className="btn-clear"
            onClick={() => {
              setSearchTerm('');
              setSelectedType('');
            }}
          >
            Clear
          </button>
        )}
        <span className="filter-count">
          {filteredSites.length} Site{filteredSites.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="loading">Loading sites...</div>
      ) : filteredSites.length === 0 ? (
        <div className="empty-state">
          <h3>No Sites Found</h3>
          <p>Create your first site to organize your infrastructure</p>
          <button className="btn btn-primary" onClick={handleAdd}>
            + Create Site
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="sites-list">
          {filteredSites.map(site => (
            <div key={site.id} className="site-list-item">
              <div className="site-list-info">
                <div className="site-list-header">
                  <span className={`site-badge ${getSiteTypeBadge(site.site_type)}`}>
                    {site.site_type?.toUpperCase()}
                  </span>
                  <h3>{site.name}</h3>
                </div>
                <div className="site-list-details">
                  <span>{site.code}</span>
                  <span className="site-list-location">
                    <MapPin size={14} />
                    {site.city && `${site.city}, `}
                    {site.province || 'Location not set'}
                  </span>
                </div>
              </div>
              <div className="site-card-footer" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-edit" onClick={() => handleEdit(site)}>Edit</button>
                <button
                  className="btn btn-delete"
                  onClick={() => handleDelete(site.id)}
                  disabled={(site.infrastructures_count || 0) > 0}
                >
                  Delete
                </button>
              </div>
              <div className="site-list-arrow">
                <Eye size={18} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sites-grid">
          {filteredSites.map(site => (
            <div key={site.id} className="site-card">
              <div className="site-card-header">
                <span className="site-icon">{getSiteTypeIcon(site.site_type)}</span>
                <span className={`site-badge ${getSiteTypeBadge(site.site_type)}`}>
                  {site.site_type?.toUpperCase()}
                </span>
              </div>
              <div className="site-card-body">
                <h3>{site.name}</h3>
                <p className="site-code">{site.code}</p>
                {site.address && (
                  <p className="site-address">{site.address}</p>
                )}
                <p className="site-location">
                  <MapPin size={12} />
                  {site.city && `${site.city}, `}
                  {site.province || 'Location not set'}
                </p>
                {(site.latitude || site.longitude) && (
                  <p className="site-coords">
                    <MapPin size={11} /> {site.latitude}, {site.longitude}
                  </p>
                )}
              </div>
              <div className="site-card-footer">
                <button
                  className="btn btn-edit"
                  onClick={(e) => { e.stopPropagation(); handleEdit(site); }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(site.id); }}
                  disabled={(site.infrastructures_count || 0) > 0}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SiteForm = ({ site, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    latitude: '',
    longitude: '',
    radius_km: 1.0,
    site_type: 'pop',
    address: '',
    province: '',
    city: '',
    district: '',
    description: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name || '',
        code: site.code || '',
        latitude: site.latitude || '',
        longitude: site.longitude || '',
        radius_km: site.radius_km || 1.0,
        site_type: site.site_type || 'building',
        address: site.address || '',
        province: site.province || '',
        city: site.city || '',
        district: site.district || '',
        description: site.description || '',
        status: site.status || 'active',
      });
    }
  }, [site]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (site) {
        await siteService.update(site.id, formData);
      } else {
        await siteService.create(formData);
      }
      onSave();
    } catch (err) {
      console.error('Error saving site:', err);
      setError(err.response?.data?.message || 'Failed to save site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="site-form-container">
      <div className="form-header">
        <h2>{site ? 'Edit Site' : 'Add New Site'}</h2>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="site-form">
        <div className="form-row">
          <div className="form-group">
            <label>Site Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Solo Area Site"
            />
          </div>
          <div className="form-group">
            <label>Site Code *</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              placeholder="e.g., SOLO-01"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Site Type *</label>
            <select
              name="site_type"
              value={formData.site_type}
              onChange={handleChange}
              required
            >
              <option value="pop">POP</option>
              <option value="datacenter">Data Center</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Latitude</label>
            <input
              type="number"
              step="any"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="-7.58095260"
            />
          </div>
          <div className="form-group">
            <label>Longitude</label>
            <input
              type="number"
              step="any"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="110.77006906"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Coverage Radius (km)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            name="radius_km"
            value={formData.radius_km}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Province</label>
            <input
              type="text"
              name="province"
              value={formData.province}
              onChange={handleChange}
              placeholder="e.g., Jawa Tengah"
            />
          </div>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g., Solo"
            />
          </div>
        </div>

        <div className="form-group">
          <label>District</label>
          <input
            type="text"
            name="district"
            value={formData.district}
            onChange={handleChange}
            placeholder="e.g., Jebres"
          />
        </div>

        <div className="form-group">
          <label>Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="2"
            placeholder="Full address"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            placeholder="Additional notes"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : (site ? 'Update Site' : 'Create Site')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SiteManager;
