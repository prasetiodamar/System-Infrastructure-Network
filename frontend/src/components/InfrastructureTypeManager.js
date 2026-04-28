import React, { useState, useEffect } from 'react';
import { infrastructureService, infrastructureTypeService, portService, cableService } from '../services/services';
import InfrastructureForm from './InfrastructureForm';
import PortManager from './PortManager';
import SpliceManager from './SpliceManager';
import CableManager from './CableManager';
import CableForm from './CableForm';
import { getIconComponent, getColorByType } from '../utils/iconMapping';
import { Pencil, Trash2, MapPin, Network, Eye } from 'lucide-react';
import './InfrastructureTypeManager.css';

const InfrastructureTypeManager = ({ onViewInfrastructure }) => {
  const [types, setTypes] = useState([]);
  const [infrastructuresByType, setInfrastructuresByType] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [expandedParentTypes, setExpandedParentTypes] = useState({});
  const [showPortManager, setShowPortManager] = useState(false);
  const [showSpliceManager, setShowSpliceManager] = useState(false);
  const [showCableManager, setShowCableManager] = useState(false);
  const [selectedInfrastructure, setSelectedInfrastructure] = useState(null);
  const [portSummaries, setPortSummaries] = useState({});
  const [selectedCable, setSelectedCable] = useState(null);

  // Cable entity states
  const [cables, setCables] = useState([]);
  const [showCableForm, setShowCableForm] = useState(false);
  const [editingCableId, setEditingCableId] = useState(null);
  const [expandedCablesSection, setExpandedCablesSection] = useState(true);

  // Helper function to check if a type is OTB
  const isOTBType = (typeName) => {
    return typeName && typeName.toLowerCase().includes('otb');
  };

  // Helper function to check if a type is Joint Box
  const isJointBoxType = (typeName) => {
    console.log('isJointBoxType checking:', typeName);
    if (!typeName) return false;
    const tn = typeName.toLowerCase();
    const result = tn.includes('joint box') || tn.includes('joint-box') || tn.includes('jointbox') || tn.includes('splice');
    console.log('isJointBoxType result:', result);
    return result;
  };

  // Helper function to find type by ID (including child types)
  const findTypeById = (typeId, typeList = types) => {
    // Search in top-level types
    let found = typeList.find(t => t.id === parseInt(typeId));
    if (found) return found;

    // Search in child types
    for (const type of typeList) {
      if (type.children && type.children.length > 0) {
        found = type.children.find(t => t.id === parseInt(typeId));
        if (found) return found;
      }
    }

    return null;
  };

  // Helper function to check if infrastructure is OTB
  const isOTBInfrastructure = (infra) => {
    if (!infra) return false;

    // Check if type is already loaded
    if (infra.type && infra.type.name) {
      return isOTBType(infra.type.name);
    }

    // Check by type_id using types state (including children)
    if (infra.type_id && types) {
      const type = findTypeById(infra.type_id);
      if (type && type.name) {
        return isOTBType(type.name);
      }
    }

    return false;
  };

  // Helper function to check if infrastructure should show splice button
  const isJointBoxInfrastructure = (infra) => {
    if (!infra) return false;
    // Show for ALL infrastructures for testing
    return true;
  };

  // Helper function to check if infrastructure has cable (ODP, OLT, OTB, Joint Box)
  // POP is excluded because it's just a location/rack, not cable infrastructure
  const isCableInfrastructure = (infra) => {
    if (!infra) return false;

    const typeName = infra.type?.name || '';
    const lowerName = typeName.toLowerCase();

    return lowerName.includes('odp') ||
           lowerName.includes('olt') ||
           lowerName.includes('otb') ||
           lowerName.includes('joint box');
  };

  // Load infrastructure types on mount
  useEffect(() => {
    loadTypes();
    loadCables();
  }, []);

  // Load cables function
  const loadCables = async () => {
    try {
      const res = await cableService.getAll();
      setCables(res.data);
    } catch (error) {
      console.error('Error loading cables:', error);
    }
  };

  // Load infrastructures when a type is expanded
  useEffect(() => {
    const expandedTypeIds = Object.keys(expandedTypes).filter(id => expandedTypes[id]);
    const expandedParentIds = Object.keys(expandedParentTypes).filter(id => expandedParentTypes[id]);

    // Load infrastructures for leaf types (no children) or when parent is not showing sub-types
    const typesToLoad = expandedTypeIds.filter(id => {
      const type = types.find(t => t.id === parseInt(id));
      // Only load infrastructures if type has no children OR parent is not expanded
      return !type || !type.children || type.children.length === 0 || !expandedParentIds[id];
    });

    if (typesToLoad.length > 0) {
      loadInfrastructuresByTypes(typesToLoad);
    }
  }, [expandedTypes, expandedParentTypes, types]);

  // Load port summaries for OTB infrastructures
  useEffect(() => {
    Object.entries(infrastructuresByType).forEach(([typeId, infraList]) => {
      const type = types.find(t => t.id === parseInt(typeId));
      if (type && isOTBType(type.name) && infraList) {
        infraList.forEach(infra => {
          loadPortSummary(infra.id);
        });
      }
    });
  }, [infrastructuresByType, types]);

  const loadTypes = async () => {
    setLoadingTypes(true);
    try {
      const res = await infrastructureTypeService.getAll();
      setTypes(res.data);
      // Initialize expanded state for first type
      if (res.data.length > 0) {
        setExpandedTypes({ [res.data[0].id]: true });
      }
    } catch (error) {
      console.error('Error loading types:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  const loadInfrastructuresByTypes = async (typeIds) => {
    try {
      const res = await infrastructureService.getAll();
      const grouped = {};
      typeIds.forEach(typeId => {
        const type = findTypeById(typeId);
        const filtered = res.data.filter(infra => infra.type_id === parseInt(typeId));
        // Add type information to each infrastructure
        grouped[typeId] = filtered.map(infra => ({
          ...infra,
          type: type
        }));
      });
      setInfrastructuresByType(prev => ({ ...prev, ...grouped }));
    } catch (error) {
      console.error('Error loading infrastructures:', error);
    }
  };

  const toggleTypeExpand = (typeId, hasChildren) => {
    if (hasChildren && hasChildren.length > 0) {
      // Toggle parent types to show/hide sub-types
      setExpandedParentTypes(prev => ({
        ...prev,
        [typeId]: !prev[typeId]
      }));
      // Don't expand the type itself when showing children
      setExpandedTypes(prev => {
        const updated = { ...prev };
        delete updated[typeId];
        return updated;
      });
    } else {
      // Toggle leaf types normally
      setExpandedTypes(prev => ({
        ...prev,
        [typeId]: !prev[typeId]
      }));
    }
  };

  // Helper to get type name from selectedTypeId
  const getTypeNameFromId = (typeId) => {
    const type = types.find(t => t.id === typeId);
    return type ? type.name.toLowerCase() : '';
  };

  // Helper to get type display name from selectedTypeId
  const getTypeDisplayName = (typeId) => {
    const type = types.find(t => t.id === typeId);
    return type ? type.name : 'Infrastructure';
  };

  const handleAddInfrastructure = (typeId) => {
    setSelectedTypeId(typeId);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEditInfrastructure = (id, typeId) => {
    setSelectedTypeId(typeId);
    setEditingId(id);
    setShowForm(true);
  };

  const handleSaveInfrastructure = () => {
    setShowForm(false);
    setEditingId(null);
    setSelectedTypeId(null);
    // Reload data for all expanded types
    const expandedTypeIds = Object.keys(expandedTypes).filter(id => expandedTypes[id]);
    if (expandedTypeIds.length > 0) {
      loadInfrastructuresByTypes(expandedTypeIds);
    }
  };

  const handleDeleteInfrastructure = async (id, typeId) => {
    if (window.confirm('Are you sure you want to delete this infrastructure?')) {
      try {
        await infrastructureService.delete(id);
        setInfrastructuresByType(prev => ({
          ...prev,
          [typeId]: prev[typeId].filter(infra => infra.id !== id)
        }));
        loadInfrastructuresByType();
      } catch (error) {
        console.error('Error deleting infrastructure:', error);
        alert('Failed to delete. ' + (error.response?.data?.message || ''));
      }
    }
  };

  const handleViewInfrastructure = (infra) => {
    if (onViewInfrastructure && infra.latitude && infra.longitude) {
      onViewInfrastructure(
        parseFloat(infra.latitude),
        parseFloat(infra.longitude),
        infra.name
      );
    }
  };

  // Load port summary for an infrastructure
  const loadPortSummary = async (infrastructureId) => {
    if (!portSummaries[infrastructureId]) {
      try {
        const response = await portService.getSummary(infrastructureId);
        setPortSummaries(prev => ({
          ...prev,
          [infrastructureId]: response.data
        }));
      } catch (error) {
        console.error('Error loading port summary:', error);
      }
    }
  };

  // Handle opening port manager
  const handleManagePorts = async (infra) => {
    setSelectedInfrastructure(infra);
    await loadPortSummary(infra.id);
    setShowPortManager(true);
  };

  // Handle closing port manager
  const handleClosePortManager = () => {
    setShowPortManager(false);
    setSelectedInfrastructure(null);
    // Reload summaries for all OTB infrastructures
    Object.keys(infrastructuresByType).forEach(typeId => {
      const infraList = infrastructuresByType[typeId] || [];
      infraList.forEach(infra => {
        if (isOTBType(infra.type?.name)) {
          loadPortSummary(infra.id);
        }
      });
    });
  };

  // Handle opening splice manager (for Joint Box)
  const handleManageSplices = (infra) => {
    setSelectedInfrastructure(infra);
    setShowSpliceManager(true);
  };

  // Handle closing splice manager
  const handleCloseSpliceManager = () => {
    setShowSpliceManager(false);
    setSelectedInfrastructure(null);
  };

  // Handle opening cable manager
  const handleManageCables = async (infra) => {
    try {
      // For now, we'll open cable manager directly
      // In production, you'd want to show a list of cables first
      const response = await cableService.getAll();
      // Filter cables connected to this infrastructure
      const connectedCables = response.data.filter(
        cable => cable.from_infrastructure_id === infra.id || cable.to_infrastructure_id === infra.id
      );

      if (connectedCables.length > 0) {
        // Open first cable for now
        setSelectedCable(connectedCables[0]);
        setShowCableManager(true);
      } else {
        alert('No cables connected to this infrastructure');
      }
    } catch (error) {
      console.error('Error loading cables:', error);
      alert('Gagal memuat data cable');
    }
  };

  // Handle closing cable manager
  const handleCloseCableManager = () => {
    setShowCableManager(false);
    setSelectedCable(null);
  };

  // Cable entity handlers
  const handleAddCable = () => {
    setEditingCableId(null);
    setShowCableForm(true);
  };

  const handleEditCable = (cable) => {
    setEditingCableId(cable.id);
    setShowCableForm(true);
  };

  const handleDeleteCable = async (cableId) => {
    if (window.confirm('Are you sure you want to delete this cable? This will also delete all cores and splices.')) {
      try {
        await cableService.delete(cableId);
        await loadCables();
      } catch (error) {
        console.error('Error deleting cable:', error);
        alert('Failed to delete cable: ' + (error.response?.data?.error || 'Unknown error'));
      }
    }
  };

  const handleCableFormSave = () => {
    setShowCableForm(false);
    setEditingCableId(null);
    loadCables();
  };

  const handleManageCores = (cable) => {
    setSelectedCable(cable);
    setShowCableManager(true);
  };

  const getCableTypeColor = (cableType) => {
    return cableType?.color || '#607D8B';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': { color: '#4CAF50', label: 'Active' },
      'inactive': { color: '#9E9E9E', label: 'Inactive' },
      'maintenance': { color: '#FF9800', label: 'Maintenance' },
    };
    const s = statusMap[status] || { color: '#999', label: status };
    return (
      <span style={{
        backgroundColor: s.color,
        color: 'white',
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600'
      }}>
        {s.label}
      </span>
    );
  };

  if (loadingTypes) {
    return <div className="loading">Loading infrastructure types...</div>;
  }

  return (
    <div className="infrastructure-type-manager">
      <div className="infrastructure-header">
        <h2>Infrastructure Management by Type</h2>
      </div>

      {showForm && (
        <div className="form-modal">
          <div className="form-modal-content">
            <InfrastructureForm
              onSave={handleSaveInfrastructure}
              onCancel={() => setShowForm(false)}
              editingId={editingId}
              preSelectedTypeId={selectedTypeId}
              typeName={getTypeNameFromId(selectedTypeId)}
            />
          </div>
        </div>
      )}

      <div className="types-container">
        {/* Cables Type Card */}
        <div className="type-card">
          <div
            className="type-header"
            onClick={() => setExpandedCablesSection(!expandedCablesSection)}
          >
            <div className="type-icon-section">
              <div
                className="type-icon"
                style={{ backgroundColor: '#667eea' }}
              >
                🔌
              </div>
              <div className="type-info">
                <h3>Cables</h3>
                <p className="type-description">Manage fiber optic cables with core tracking</p>
              </div>
            </div>
            <div className="type-actions">
              <span className="infra-count">
                {cables.length} cables
              </span>
              <button
                className="add-type-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddCable();
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'white',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginRight: '10px'
                }}
              >
                + Add Cable
              </button>
              <span className={`expand-icon ${expandedCablesSection ? 'expanded' : ''}`}>
                ▼
              </span>
            </div>
          </div>

          {expandedCablesSection && (
            <div className="type-content">
              {cables.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔌</div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>No cables yet</h4>
                  <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
                    Create your first cable to start tracking fiber connections
                  </p>
                  <button
                    onClick={handleAddCable}
                    style={{
                      padding: '10px 20px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                  >
                    + Create First Cable
                  </button>
                </div>
              ) : (
                <table className="infra-table">
                  <thead>
                    <tr>
                      <th>Cable Name</th>
                      <th>Type</th>
                      <th>Cores</th>
                      <th>Length</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cables.map((cable) => (
                      <tr key={cable.id}>
                        <td><strong>{cable.name || 'Unnamed'}</strong></td>
                        <td>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: getCableTypeColor(cable.cable_type),
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            {cable.cable_type?.name || 'N/A'}
                          </span>
                        </td>
                        <td>{cable.core_count || 0}</td>
                        <td>
                          {cable.length
                            ? `${(cable.length / 1000).toFixed(2)} km`
                            : 'N/A'}
                        </td>
                        <td>{cable.fromInfrastructure?.name || 'N/A'}</td>
                        <td>{cable.toInfrastructure?.name || 'N/A'}</td>
                        <td>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: cable.status === 'active' ? '#4CAF50' : cable.status === 'inactive' ? '#9E9E9E' : '#FF9800',
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            {cable.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                              onClick={() => handleManageCores(cable)}
                              title="Manage cores"
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#6f42c1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              💎 Cores
                            </button>
                            <button
                              onClick={() => handleEditCable(cable)}
                              title="Edit cable"
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#FF9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteCable(cable.id)}
                              title="Delete cable"
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {types.length === 0 ? (
          <p className="no-data">No infrastructure types found.</p>
        ) : (
          types
            .filter(type => type.name !== 'Kabel') // Hide Kabel type
            .map(type => {
            const isParentExpanded = expandedParentTypes[type.id];
            const isTypeExpanded = expandedTypes[type.id];
            const hasChildren = type.children && type.children.length > 0;
            const infrastructures = infrastructuresByType[type.id] || [];
            const IconComponent = getIconComponent(type.name);
            const color = getColorByType(type.name);

            return (
              <div key={type.id} className="type-card">
                <div
                  className="type-header"
                  onClick={() => toggleTypeExpand(type.id, type.children)}
                >
                  <div className="type-icon-section">
                    <div
                      className="type-icon"
                      style={{ backgroundColor: color }}
                    >
                      <IconComponent />
                    </div>
                    <div className="type-info">
                      <h3>{type.name}</h3>
                      <p className="type-description">{type.description}</p>
                    </div>
                  </div>
                  <div className="type-actions">
                    <span className="infra-count">
                      {hasChildren ? `${type.children.length} types` : `${infrastructures.length} items`}
                    </span>
                    {!hasChildren && (
                      <button
                        className="add-type-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddInfrastructure(type.id);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'white',
                          color: color,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginRight: '10px'
                        }}
                      >
                        + Add
                      </button>
                    )}
                    <span className={`expand-icon ${isParentExpanded || isTypeExpanded ? 'expanded' : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Show sub-types when parent is expanded */}
                {isParentExpanded && hasChildren && (
                  <div className="sub-types-container">
                    {type.children.map(childType => (
                      <div key={childType.id} className="sub-type-card" style={{ marginLeft: '20px' }}>
                        <div
                          className="type-header"
                          onClick={() => toggleTypeExpand(childType.id, childType.children)}
                        >
                          <div className="type-icon-section">
                            <div
                              className="type-icon"
                              style={{
                                backgroundColor: color,
                                width: '28px',
                                height: '28px',
                                fontSize: '14px'
                              }}
                            >
                              <IconComponent />
                            </div>
                            <div className="type-info">
                              <h4>{childType.name}</h4>
                              <p className="type-description">{childType.description}</p>
                            </div>
                          </div>
                          <div className="type-actions">
                            <span className="infra-count">
                              {infrastructuresByType[childType.id]?.length || 0} items
                            </span>
                            <button
                              className="add-type-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddInfrastructure(childType.id);
                              }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: 'white',
                                color: color,
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                marginRight: '10px'
                              }}
                            >
                              + Add
                            </button>
                            <span className={`expand-icon ${expandedTypes[childType.id] ? 'expanded' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>

                        {/* Infrastructure list for sub-type */}
                        {expandedTypes[childType.id] && (
                          <div className="type-content">
                            <div className="add-button-container">
                              <button
                                className="add-infrastructure-btn"
                                onClick={() => handleAddInfrastructure(childType.id)}
                              >
                                + Add {childType.name}
                              </button>
                            </div>

                            {(!infrastructuresByType[childType.id] || infrastructuresByType[childType.id]?.length === 0) ? (
                              <p className="no-infrastructures">
                                No {childType.name} infrastructure added yet.
                              </p>
                            ) : isJointBoxType(childType.name) ? (
                              /* Card View for Joint Box (child type) */
                              <div className="olts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '15px' }}>
                                {(infrastructuresByType[childType.id] || []).map(infra => (
                                  <div key={infra.id} className="olt-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                                    <div className="olt-header" style={{ background: '#fff7ed', padding: '12px 15px', borderBottom: '1px solid #fed7aa' }}>
                                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>{infra.name}</h3>
                                      <span className="olt-type-badge" style={{ background: '#fd7e14', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                                        {childType.name}
                                      </span>
                                    </div>
                                    <div className="olt-body" style={{ padding: '15px' }}>
                                      <div className="olt-stat" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#666', fontSize: '13px' }}>
                                        <Network size={16} />
                                        <span>{childType.name}</span>
                                      </div>
                                      <div className="olt-rack-location" style={{ marginBottom: '8px', fontSize: '13px', color: '#666' }}>
                                        {infra.latitude && infra.longitude && (
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={14} />
                                            {parseFloat(infra.latitude).toFixed(4)}, {parseFloat(infra.longitude).toFixed(4)}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ cursor: 'pointer', color: '#fd7e14', marginTop: '10px', fontSize: '13px', fontWeight: '500' }} onClick={() => handleManageSplices(infra)}>
                                        🔗 {infra.splices_count || 0} Splices - Click to manage
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', padding: '10px 15px', borderTop: '1px solid #eee' }}>
                                      <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => handleViewInfrastructure(infra)}>
                                        <MapPin size={14} /> Map
                                      </button>
                                      <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => handleEditInfrastructure(infra.id, childType.id)}>
                                        <Pencil size={14} /> Edit
                                      </button>
                                      <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2' }} onClick={() => handleDeleteInfrastructure(infra.id, childType.id)}>
                                        <Trash2 size={14} /> Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <table className="infrastructures-table">
                                <thead>
                                  <tr>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Location</th>
                                    {childType.name === 'Kabel' && <th>Cable Length</th>}
                                    {(childType.name.toLowerCase().includes('joint box') || childType.name.toLowerCase().includes('jointbox') || childType.name.toLowerCase().includes('splice')) && <th>Splices</th>}
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(infrastructuresByType[childType.id] || []).map(infra => (
                                    <tr key={infra.id}>
                                      <td className="name-cell">{infra.name}</td>
                                      <td>
                                        <span className={`status-badge status-${infra.status}`}>
                                          {infra.status}
                                        </span>
                                      </td>
                                      <td className="location-cell">
                                        {infra.latitude && infra.longitude
                                          ? `${parseFloat(infra.latitude).toFixed(4)}, ${parseFloat(infra.longitude).toFixed(4)}`
                                          : 'N/A'}
                                      </td>
                                      {childType.name === 'Kabel' && (
                                        <td>
                                          {infra.cable_length ? `${infra.cable_length}m` : 'N/A'}
                                        </td>
                                      )}
                                      {(childType.name.toLowerCase().includes('joint box') || childType.name.toLowerCase().includes('jointbox') || childType.name.toLowerCase().includes('splice')) && (
                                        <td>
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            background: (infra.splices_count || 0) > 0 ? '#fef3c7' : '#f3f4f6',
                                            color: (infra.splices_count || 0) > 0 ? '#92400e' : '#6b7280',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                          }}>
                                            🔗 {infra.splices_count || 0}
                                          </span>
                                        </td>
                                      )}
                                      <td className="actions-cell">
                                        {/* Only show Ports button for OTB infrastructures */}
                                        {isOTBInfrastructure(infra) && (
                                          <button
                                            onClick={() => handleManagePorts(infra)}
                                            title="Manage Ports"
                                            style={{
                                              padding: '6px 12px',
                                              backgroundColor: '#28a745',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              marginRight: '5px',
                                              fontSize: '12px'
                                            }}
                                          >
                                            🔌 Ports
                                          </button>
                                        )}
                                        {/* Show Splices button for Joint Box */}
                                        {isJointBoxInfrastructure(infra) && (
                                          <button
                                            onClick={() => handleManageSplices(infra)}
                                            title="Manage Splices"
                                            style={{
                                              padding: '6px 12px',
                                              backgroundColor: '#fd7e14',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              marginRight: '5px',
                                              fontSize: '12px'
                                            }}
                                          >
                                            🔗 Splices
                                          </button>
                                        )}
                                        {/* Show Cores button for cable-related infrastructures */}
                                        {isCableInfrastructure(infra) && (
                                          <button
                                            onClick={() => handleManageCables(infra)}
                                            title="Manage Cables"
                                            style={{
                                              padding: '6px 12px',
                                              backgroundColor: '#6f42c1',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              marginRight: '5px',
                                              fontSize: '12px'
                                            }}
                                          >
                                            💎 Cores
                                          </button>
                                        )}
                                        {/* Splice button for Joint Box - shown left of View button */}
                                        {isJointBoxInfrastructure(infra) && (
                                          <button
                                            onClick={() => handleManageSplices(infra)}
                                            title="Manage Splices"
                                            style={{
                                              padding: '6px 12px',
                                              backgroundColor: '#fd7e14',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              marginRight: '5px',
                                              fontSize: '12px'
                                            }}
                                          >
                                            🔗 Splice
                                          </button>
                                        )}
                                        <button
                                          className="view-btn"
                                          onClick={() => handleViewInfrastructure(infra)}
                                          title="View on Map"
                                          style={{
                                            padding: '6px 12px',
                                            backgroundColor: '#2196F3',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            marginRight: '5px',
                                            fontSize: '12px'
                                          }}
                                        >
                                          👁 View
                                        </button>
                                        <button
                                          className="edit-btn"
                                          onClick={() => handleEditInfrastructure(infra.id, childType.id)}
                                          title="Edit"
                                        >
                                          ✎
                                        </button>
                                        <button
                                          className="delete-btn"
                                          onClick={() => handleDeleteInfrastructure(infra.id, childType.id)}
                                          title="Delete"
                                        >
                                          🗑
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Show infrastructure list for non-parent types or when showing directly */}
                {isTypeExpanded && !hasChildren && (
                  <div className="type-content">
                    <div className="add-button-container">
                      <button
                        className="add-infrastructure-btn"
                        onClick={() => handleAddInfrastructure(type.id)}
                      >
                        + Add {type.name}
                      </button>
                    </div>

                    {infrastructures.length === 0 ? (
                      <p className="no-infrastructures">
                        No {type.name} infrastructure added yet.
                      </p>
                    ) : isJointBoxType(type.name) ? (
                      /* Card View for Joint Box */
                      <div className="olts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '15px' }}>
                        {infrastructures.map(infra => (
                          <div key={infra.id} className="olt-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                            <div className="olt-header" style={{ background: '#fff7ed', padding: '12px 15px', borderBottom: '1px solid #fed7aa' }}>
                              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>{infra.name}</h3>
                              <span className="olt-type-badge" style={{ background: '#fd7e14', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                                {type.name}
                              </span>
                            </div>
                            <div className="olt-body" style={{ padding: '15px' }}>
                              <div className="olt-stat" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#666', fontSize: '13px' }}>
                                <Network size={16} />
                                <span>{type.name}</span>
                              </div>
                              <div className="olt-rack-location" style={{ marginBottom: '8px', fontSize: '13px', color: '#666' }}>
                                {infra.latitude && infra.longitude && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={14} />
                                    {parseFloat(infra.latitude).toFixed(4)}, {parseFloat(infra.longitude).toFixed(4)}
                                  </span>
                                )}
                              </div>
                              <div style={{ cursor: 'pointer', color: '#fd7e14', marginTop: '10px', fontSize: '13px', fontWeight: '500' }} onClick={() => handleManageSplices(infra)}>
                                🔗 {infra.splices_count || 0} Splices - Click to manage
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', padding: '10px 15px', borderTop: '1px solid #eee' }}>
                              <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => handleEditInfrastructure(infra.id, type.id)}>
                                <Pencil size={14} /> Edit
                              </button>
                              <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '12px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2' }} onClick={() => handleDeleteInfrastructure(infra.id, type.id)}>
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <table className="infrastructures-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Location</th>
                            {type.name === 'Kabel' && <th>Cable Length</th>}
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {infrastructures.map(infra => (
                            <tr key={infra.id}>
                              <td className="name-cell">{infra.name}</td>
                              <td>
                                <span className={`status-badge status-${infra.status}`}>
                                  {infra.status}
                                </span>
                              </td>
                              <td className="location-cell">
                                {infra.latitude && infra.longitude
                                  ? `${parseFloat(infra.latitude).toFixed(4)}, ${parseFloat(infra.longitude).toFixed(4)}`
                                  : 'N/A'}
                              </td>
                              {type.name === 'Kabel' && (
                                <td>
                                  {infra.cable_length ? `${infra.cable_length}m` : 'N/A'}
                                </td>
                              )}
                              <td className="actions-cell">
                                {/* Only show Ports button for OTB infrastructures */}
                                {isOTBInfrastructure(infra) && (
                                  <button
                                    onClick={() => handleManagePorts(infra)}
                                    title="Manage Ports"
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#28a745',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      marginRight: '5px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    🔌 Ports
                                  </button>
                                )}
                                {/* Show Splices button for Joint Box */}
                                {isJointBoxInfrastructure(infra) && (
                                  <button
                                    onClick={() => handleManageSplices(infra)}
                                    title="Manage Splices"
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#fd7e14',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      marginRight: '5px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    🔗 Splices
                                  </button>
                                )}
                                {/* Show Cores button for cable-related infrastructures */}
                                {isCableInfrastructure(infra) && (
                                  <button
                                    onClick={() => handleManageCables(infra)}
                                    title="Manage Cables"
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#6f42c1',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      marginRight: '5px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    💎 Cores
                                  </button>
                                )}
                                {/* Splice button for Joint Box */}
                                {isJointBoxInfrastructure(infra) && (
                                  <button
                                    onClick={() => handleManageSplices(infra)}
                                    title="Manage Splices"
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#fd7e14',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      marginRight: '5px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    🔗 Splice
                                  </button>
                                )}
                                <button
                                  className="view-btn"
                                  onClick={() => handleViewInfrastructure(infra)}
                                  title="View on Map"
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    marginRight: '5px',
                                    fontSize: '12px'
                                  }}
                                >
                                  👁 View
                                </button>
                                <button
                                  className="edit-btn"
                                  onClick={() => handleEditInfrastructure(infra.id, type.id)}
                                  title="Edit"
                                >
                                  ✎
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() => handleDeleteInfrastructure(infra.id, type.id)}
                                  title="Delete"
                                >
                                  🗑
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Cable Form Modal */}
      {showCableForm && (
        <div className="form-modal" style={{ zIndex: 2000 }}>
          <div className="form-modal-content" style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="form-modal-header">
              <h2>
                {editingCableId ? '✎ Edit Cable' : '➕ Add New Cable'}
              </h2>
              <button
                className="form-close-btn"
                onClick={() => setShowCableForm(false)}
              >
                ✕
              </button>
            </div>
            <CableForm
              onSave={handleCableFormSave}
              onCancel={() => setShowCableForm(false)}
              editingId={editingCableId}
            />
          </div>
        </div>
      )}

      {showPortManager && selectedInfrastructure && (
        <div className="form-modal" style={{ zIndex: 2000 }}>
          <div className="form-modal-content" style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
            <PortManager
              infrastructure={selectedInfrastructure}
              onClose={handleClosePortManager}
            />
          </div>
        </div>
      )}

      {showSpliceManager && selectedInfrastructure && (
        <div className="form-modal" style={{ zIndex: 2000 }}>
          <div className="form-modal-content" style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
            <SpliceManager
              jointBox={selectedInfrastructure}
              onClose={handleCloseSpliceManager}
            />
          </div>
        </div>
      )}

      {showCableManager && selectedCable && (
        <div className="form-modal" style={{ zIndex: 2000 }}>
          <div className="form-modal-content" style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
            <CableManager
              cable={selectedCable}
              onClose={handleCloseCableManager}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InfrastructureTypeManager;
