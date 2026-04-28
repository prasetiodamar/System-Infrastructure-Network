import React, { useState, useEffect, useMemo } from 'react';
import { infrastructureService, infrastructureTypeService, siteService } from '../services/services';
import './OLTManager.css';

const OTBForm = ({ onSave, onCancel, editingId, preSelectedTypeId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [types, setTypes] = useState([]);
  const [pops, setPops] = useState([]);
  const [racks, setRacks] = useState([]);
  const [occupiedPositions, setOccupiedPositions] = useState([]);
  const [allInfrastructures, setAllInfrastructures] = useState([]);
  const [formData, setFormData] = useState({
    type_id: preSelectedTypeId ? preSelectedTypeId.toString() : '',
    name: '',
    description: '',
    status: 'active',
    site_id: '',
    rack_id: '',
    u_position: '',
    u_height: 1,
  });

  // Get U height based on OTB type
  const getUHeightByType = (typeId) => {
    const selectedType = types.find(t => t.id === parseInt(typeId));
    if (selectedType) {
      const typeName = selectedType.name.toLowerCase();
      if (typeName.includes('12')) return 1;
      if (typeName.includes('24')) return 2;
      if (typeName.includes('48')) return 2;
      if (typeName.includes('96')) return 6;
    }
    return 1;
  };

  useEffect(() => {
    loadTypes();
    loadPOPs();
    if (editingId) {
      loadData();
    }
  }, [editingId, preSelectedTypeId]);

  // Load racks when site changes or when editing with pre-selected site/rack
  useEffect(() => {
    if (formData.site_id) {
      loadRacksAndInfras();
    } else {
      setRacks([]);
      setAllInfrastructures([]);
      setOccupiedPositions([]);
      setFormData(prev => ({ ...prev, rack_id: '', u_position: '' }));
    }
  }, [formData.site_id]);

  // Update u_height when type_id changes
  useEffect(() => {
    if (formData.type_id && types.length > 0) {
      const newUHeight = getUHeightByType(formData.type_id);
      setFormData(prev => ({ ...prev, u_height: newUHeight }));
    }
  }, [formData.type_id, types]);

  // Special handling for editing mode - load occupied positions after data is loaded
  useEffect(() => {
    if (editingId && formData.site_id && formData.rack_id && allInfrastructures.length > 0) {
      // Data is loaded, update occupied positions for the pre-selected rack
      updateOccupiedPositions(formData.rack_id, allInfrastructures);
    }
  }, [editingId, formData.site_id, formData.rack_id, allInfrastructures.length]);

  // Calculate rack height based on selected rack - use allInfrastructures to find the rack
  const selectedRackId = formData.rack_id ? parseInt(formData.rack_id) : null;
  const selectedRack = selectedRackId ? allInfrastructures.find(r => r.id === selectedRackId) : null;
  const rackHeight = selectedRack?.rack_height_u || 42;

  const loadRacksAndInfras = async () => {
    try {
      // First get the types to find rack type IDs
      const typesRes = await infrastructureTypeService.getAll();
      const rackTypeIds = typesRes.data.filter(t => t.category === 'rack').map(t => t.id);

      const res = await infrastructureService.getAll();
      const allData = res.data;
      setAllInfrastructures(allData);

      const siteId = parseInt(formData.site_id);

      // Filter racks at selected site using type_id matching
      const siteRacks = allData.filter(infra =>
        rackTypeIds.includes(infra.type_id) &&
        parseInt(infra.site_id) === siteId
      );
      setRacks(siteRacks);

      // If rack already selected, update occupied positions
      if (formData.rack_id) {
        updateOccupiedPositions(formData.rack_id, allData);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const updateOccupiedPositions = (rackId, infras = allInfrastructures) => {
    const rId = parseInt(rackId);
    if (rId && infras.length > 0) {
      // Get all occupied U positions considering u_height
      const occupiedSet = new Set();
      infras
        .filter(infra =>
          parseInt(infra.rack_id) === rId &&
          infra.id !== editingId &&
          infra.u_position
        )
        .forEach(infra => {
          const uPos = parseInt(infra.u_position);
          const uHeight = infra.u_height || 1;
          // Mark all positions occupied by this device
          for (let i = 0; i < uHeight; i++) {
            occupiedSet.add(uPos + i);
          }
        });
      setOccupiedPositions(Array.from(occupiedSet).sort((a, b) => a - b));
    } else {
      setOccupiedPositions([]);
    }
  };

  // Update occupied when rack changes
  const handleRackChange = (e) => {
    const rackId = e.target.value;
    setFormData(prev => ({ ...prev, rack_id: rackId, u_position: '' }));
    updateOccupiedPositions(rackId);
  };

  const loadTypes = async () => {
    try {
      const res = await infrastructureTypeService.getAll();
      const otbTypes = res.data.filter(t => t.name.toLowerCase().includes('otb'));
      setTypes(otbTypes);
    } catch (err) {
      console.error('Error loading types:', err);
    }
  };

  const loadPOPs = async () => {
    try {
      const res = await siteService.getAll();
      // Filter Sites dengan site_type POP atau Data Center
      const popList = res.data.filter(site =>
        site.site_type?.toLowerCase() === 'pop' ||
        site.site_type?.toLowerCase() === 'datacenter'
      );
      setPops(popList);
    } catch (err) {
      console.error('Error loading POPs:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await infrastructureService.getAll();
      const data = res.data.find(i => i.id === editingId);
      if (data) {
        setFormData({
          type_id: data.type_id?.toString() || '',
          name: data.name || '',
          description: data.description || '',
          status: data.status || 'active',
          site_id: data.site_id?.toString() || '',
          rack_id: data.rack_id?.toString() || '',
          u_position: data.u_position?.toString() || '',
          u_height: data.u_height || getUHeightByType(data.type_id),
        });
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        type_id: parseInt(formData.type_id),
        site_id: formData.site_id ? parseInt(formData.site_id) : null,
        rack_id: formData.rack_id ? parseInt(formData.rack_id) : null,
        u_position: formData.u_position ? parseInt(formData.u_position) : null,
        u_height: parseInt(formData.u_height) || 1,
      };

      if (editingId) {
        await infrastructureService.update(editingId, payload);
      } else {
        await infrastructureService.create(payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="olt-form-container">
      <div className="form-header">
        <h2>{editingId ? 'Edit OTB' : 'Add New OTB'}</h2>
        <button className="btn-close" onClick={onCancel}>×</button>
      </div>

      {error && (
        <div className="error-message" style={{ margin: '0 20px 10px', padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="site-form">
        {/* Infrastructure Type */}
        <div className="form-row">
          <div className="form-group">
            <label>Infrastructure Type *</label>
            <select
              name="type_id"
              value={formData.type_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Type</option>
              {types.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter OTB name"
            />
          </div>
        </div>

        {/* Site (POP/Data Center) */}
        <div className="form-row">
          <div className="form-group">
            <label>Site (POP/Data Center) *</label>
            <select
              name="site_id"
              value={formData.site_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Site</option>
              {pops.map(pop => (
                <option key={pop.id} value={pop.id}>
                  {pop.name} ({pop.site_type === 'datacenter' ? 'Data Center' : 'POP'})
                </option>
              ))}
            </select>
            {pops.length === 0 && (
              <small style={{ color: '#999' }}>No POP/Data Center found</small>
            )}
          </div>
        </div>

        {/* Rack - shown after Site is selected */}
        {formData.site_id && (
          <div className="form-row">
            <div className="form-group">
              <label>Rack</label>
              <select
                name="rack_id"
                value={formData.rack_id}
                onChange={handleRackChange}
              >
                <option value="">Select Rack</option>
                {racks.map(rack => (
                  <option key={rack.id} value={rack.id}>
                    {rack.name}
                  </option>
                ))}
              </select>
              {racks.length === 0 && (
                <small style={{ color: '#999' }}>No rack found in this site</small>
              )}
            </div>
          </div>
        )}

        {/* U Position - shown after Rack is selected */}
        {formData.site_id && formData.rack_id && (
          <div className="form-row">
            <div className="form-group">
              <label>
                U Position {formData.u_height > 1 && (
                  <span style={{ color: '#1976d2', fontWeight: 'normal' }}> (requires {formData.u_height}U)</span>
                )}
              </label>
              <select
                name="u_position"
                value={formData.u_position}
                onChange={handleChange}
              >
                <option value="">Select U Position</option>
                {Array.from({length: rackHeight - formData.u_height + 1}, (_, i) => i + 1).map(startU => {
                  const endU = startU + formData.u_height - 1;
                  // Check if any position in the range is occupied
                  const rangePositions = [];
                  for (let i = 0; i < formData.u_height; i++) {
                    rangePositions.push(startU + i);
                  }
                  const isOccupied = rangePositions.some(pos => occupiedPositions.includes(pos));
                  return (
                    <option key={startU} value={startU} disabled={isOccupied}>
                      {isOccupied ? `U${startU}-${endU} (Occupied)` : `U${startU}-${endU}`}
                    </option>
                  );
                })}
              </select>
              {formData.u_height > 1 && (
                <small style={{ color: '#1976d2', display: 'block', marginTop: '4px' }}>
                  This OTB type requires {formData.u_height}U of rack space
                </small>
              )}
              {occupiedPositions.length > 0 && (
                <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                  Occupied: {occupiedPositions.sort((a,b) => a-b).map(u => `U${u}`).join(', ')}
                </small>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="form-row">
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Enter description"
            />
          </div>
        </div>

        {/* Status */}
        <div className="form-row">
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

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create OTB'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OTBForm;
