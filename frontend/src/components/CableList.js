import React, { useState, useEffect } from 'react';
import { cableService, cableTypeService } from '../services/services';
import { Waypoints, Download, Search, Trash2, Pencil } from 'lucide-react';
import CableForm from './CableForm';
import CableManager from './CableManager';
import './CableList.css';

const CableList = () => {
  const [cables, setCables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCableManager, setShowCableManager] = useState(false);
  const [selectedCable, setSelectedCable] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadCables();
  }, []);

  const loadCables = async () => {
    try {
      setLoading(true);
      const response = await cableService.getAll();
      setCables(response.data);
    } catch (error) {
      console.error('Error loading cables:', error);
      alert('Failed to load cables');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (cable) => {
    setEditingId(cable.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this cable? This will also delete all cores and splices.')) {
      try {
        await cableService.delete(id);
        setCables(cables.filter(c => c.id !== id));
        loadCables();
      } catch (error) {
        console.error('Error deleting cable:', error);
        alert('Failed to delete cable: ' + (error.response?.data?.error || 'Unknown error'));
      }
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingId(null);
    loadCables();
  };

  const handleManageCores = (cable) => {
    setSelectedCable(cable);
    setShowCableManager(true);
  };

  const getCableTypeColor = (cableType) => {
    return cableType?.color || '#E91E63';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'planned': { color: '#9E9E9E', label: 'Planned' },
      'installed': { color: '#2196F3', label: 'Installed' },
      'spliced': { color: '#FF9800', label: 'Spliced' },
      'active': { color: '#4CAF50', label: 'Active' },
      'inactive': { color: '#607D8B', label: 'Inactive' },
      'maintenance': { color: '#FF5722', label: 'Maintenance' },
      'damaged': { color: '#F44336', label: 'Damaged' },
    };
    const s = statusMap[status] || { color: '#999', label: status };
    return (
      <span className="status-badge" style={{ backgroundColor: s.color }}>
        {s.label}
      </span>
    );
  };

  // Filter cables
  const filteredCables = cables.filter(cable => {
    const matchesSearch = searchQuery === '' ||
      cable.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cable.cable_type?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cable.from_infrastructure?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cable.to_infrastructure?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || cable.cable_type_id === parseInt(filterType);
    const matchesStatus = filterStatus === 'all' || cable.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Type', 'Status', 'From', 'To', 'Core Count', 'Length (m)', 'Brand', 'Installation Date'];
    const rows = filteredCables.map(cable => [
      cable.name || '',
      cable.cable_type?.name || '',
      cable.status || '',
      cable.from_infrastructure?.name || '',
      cable.to_infrastructure?.name || '',
      cable.core_count || 0,
      cable.length || '',
      cable.brand || '',
      cable.installation_date || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cables_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Get status counts
  const statusCounts = {
    all: cables.length,
    planned: cables.filter(c => c.status === 'planned').length,
    installed: cables.filter(c => c.status === 'installed').length,
    spliced: cables.filter(c => c.status === 'spliced').length,
    active: cables.filter(c => c.status === 'active').length,
    inactive: cables.filter(c => c.status === 'inactive').length,
    maintenance: cables.filter(c => c.status === 'maintenance').length,
    damaged: cables.filter(c => c.status === 'damaged').length,
  };

  const getStatusColor = (status) => {
    const colors = {
      planned: '#9E9E9E',
      installed: '#2196F3',
      spliced: '#FF9800',
      active: '#4CAF50',
      inactive: '#607D8B',
      maintenance: '#FF5722',
      damaged: '#F44336',
    };
    return colors[status] || '#999';
  };

  // Get unique cable types for filter - use Map to track unique IDs
  const cableTypesMap = new Map();
  cables.forEach(c => {
    if (c.cable_type && c.cable_type.id && c.cable_type.name) {
      cableTypesMap.set(c.cable_type.id, c.cable_type);
    }
  });
  const cableTypes = Array.from(cableTypesMap.values());

  if (loading) {
    return (
      <div className="cable-manager">
        <div className="loading">Loading cables...</div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="cable-manager">
        <div className="form-header">
          <h2>{editingId ? 'Edit Cable' : 'Add New Cable'}</h2>
          <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
        </div>
        <div style={{ padding: '20px' }}>
          <CableForm
            onSave={handleFormSave}
            onCancel={() => setShowForm(false)}
            editingId={editingId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cable-manager">
      <div className="manager-header">
        <h2><Waypoints size={24} className="header-icon" /> Cable Management</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          <Waypoints size={18} /> Add Cable
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search cables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          {cableTypes.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            borderColor: filterStatus !== 'all' ? getStatusColor(filterStatus) : '#e5e7eb',
            background: filterStatus !== 'all' ? `${getStatusColor(filterStatus)}10` : 'white',
          }}
        >
          <option value="all">All Status</option>
          <option value="planned">Planned</option>
          <option value="installed">Installed</option>
          <option value="spliced">Spliced</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="damaged">Damaged</option>
        </select>
        <button className="export-btn" onClick={exportToCSV}>
          <Download size={14} /> Export
        </button>
        {(searchQuery || filterType !== 'all' || filterStatus !== 'all') && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
              setFilterStatus('all');
            }}
          >
            Clear
          </button>
        )}
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {filteredCables.length} cable{filteredCables.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status Tabs */}
      <div className="filter-tabs">
        {['all', 'active', 'planned', 'installed', 'spliced', 'inactive', 'maintenance', 'damaged'].map(status => (
          <button
            key={status}
            className={filterStatus === status ? 'active' : ''}
            onClick={() => setFilterStatus(status)}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="count-badge">{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      {/* Cables Grid */}
      {filteredCables.length === 0 ? (
        <div className="empty-state">
          <Waypoints size={48} style={{ color: '#9ca3af' }} />
          <h3>No cables found</h3>
          <p>
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Get started by adding your first cable.'}
          </p>
          <button className="btn btn-primary" onClick={handleAdd}>
            + Create Cable
          </button>
        </div>
      ) : (
        <div className="cables-grid">
          {filteredCables.map((cable) => (
            <div key={cable.id} className="cable-card">
              <div className="cable-card-content">
                <div className="cable-header">
                  <h3>{cable.name || 'Unnamed Cable'}</h3>
                  <span className="cable-type-badge">
                    {cable.cable_type?.name || 'Cable'}
                  </span>
                </div>

                <div className="cable-body">
                  <div className="cable-stat">
                    <span style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: getCableTypeColor(cable.cable_type)
                    }}></span>
                    <span>{cable.cable_type?.name || 'Unknown'}</span>
                  </div>
                  <div className="cable-route-info">
                    <div>From: {cable.from_infrastructure?.name || 'N/A'}</div>
                    <div>To: {cable.to_infrastructure?.name || 'N/A'}</div>
                  </div>
                  <div className="cable-ports-info">
                    {cable.core_count} cores | {cable.length ? `${(cable.length / 1000).toFixed(2)} km` : 'N/A'}
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => { e.stopPropagation(); handleManageCores(cable); }}
                  >
                    Cores
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => { e.stopPropagation(); handleEdit(cable); }}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={(e) => { e.stopPropagation(); handleDelete(cable.id); }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCableManager && selectedCable && (
        <div className="modal-overlay" onClick={() => setShowCableManager(false)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowCableManager(false)}>
              ×
            </button>
            <CableManager
              cable={selectedCable}
              onClose={() => setShowCableManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CableList;
