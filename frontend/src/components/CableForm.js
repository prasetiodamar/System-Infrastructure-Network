import React, { useState, useEffect } from 'react';
import { cableService, cableTypeService, infrastructureService } from '../services/services';
import CableDrawer from './CableDrawer';
import './CableForm.css';

// Helper to determine if text should be light or dark based on background
const getContrastColor = (hexColor) => {
  if (!hexColor) return '#000';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000' : '#fff';
};

const CableForm = ({ onSave, onCancel, editingId }) => {
  const [cableTypes, setCableTypes] = useState([]);
  const [infrastructures, setInfrastructures] = useState([]);
  const [formData, setFormData] = useState({
    cable_type_id: '',
    from_infrastructure_id: '',
    to_infrastructure_id: '',
    name: '',
    length: 0,
    core_count: 0,
    brand: '',
    installation_date: '',
    status: 'planned',
    path_coordinates: null,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    loadCableTypes();
    loadInfrastructures();
    if (editingId) {
      loadCableData(editingId);
      setIsEditMode(true);
    }
  }, [editingId]);

  const loadCableData = async (id) => {
    try {
      setLoading(true);
      const res = await cableService.getById(id);
      const cable = res.data;

      // Parse path_coordinates if it's a JSON string
      let pathCoordinates = null;
      if (cable.path_coordinates) {
        try {
          pathCoordinates = typeof cable.path_coordinates === 'string'
            ? JSON.parse(cable.path_coordinates)
            : cable.path_coordinates;
        } catch (e) {
          console.warn('Could not parse path_coordinates:', e);
        }
      }

      // Get coordinates from from/to infrastructure (or their sites)
      const getInfraCoords = (infra) => {
        if (!infra) return null;
        let lat = parseFloat(infra.latitude);
        let lng = parseFloat(infra.longitude);
        if (isNaN(lat) || isNaN(lng)) {
          lat = parseFloat(infra.site?.latitude);
          lng = parseFloat(infra.site?.longitude);
        }
        if (!isNaN(lat) && !isNaN(lng)) {
          return [lat, lng];
        }
        return null;
      };

      // Adjust path to connect from/to infrastructure points
      const fromCoords = getInfraCoords(cable.from_infrastructure);
      const toCoords = getInfraCoords(cable.to_infrastructure);

      if (pathCoordinates && Array.isArray(pathCoordinates) && pathCoordinates.length > 0) {
        // Adjust first point to from infrastructure
        if (fromCoords) {
          pathCoordinates[0] = fromCoords;
        }
        // Adjust last point to to infrastructure
        if (toCoords) {
          pathCoordinates[pathCoordinates.length - 1] = toCoords;
        }
      } else if (fromCoords && toCoords) {
        // If no path, create one from from to to
        pathCoordinates = [fromCoords, toCoords];
      } else if (fromCoords) {
        pathCoordinates = [fromCoords];
      } else if (toCoords) {
        pathCoordinates = [toCoords];
      }

      setFormData({
        cable_type_id: cable.cable_type_id?.toString() || '',
        from_infrastructure_id: cable.from_infrastructure_id?.toString() || '',
        to_infrastructure_id: cable.to_infrastructure_id?.toString() || '',
        name: cable.name || '',
        length: cable.length || 0,
        core_count: cable.core_count || 0,
        brand: cable.brand || '',
        installation_date: cable.installation_date || '',
        status: cable.status || 'active',
        path_coordinates: pathCoordinates,
        notes: cable.notes || '',
      });
    } catch (error) {
      console.error('Error loading cable:', error);
      setError('Failed to load cable data');
    } finally {
      setLoading(false);
    }
  };

  const loadCableTypes = async () => {
    try {
      const res = await cableTypeService.getAll();
      // Filter only active cable types and ensure they have required fields
      setCableTypes(res.data.filter(ct => ct && ct.is_active && ct.name));
    } catch (error) {
      console.error('Error loading cable types:', error);
      setCableTypes([]);
    }
  };

  const loadInfrastructures = async () => {
    try {
      const res = await infrastructureService.getAll();
      // Filter valid infrastructures
      setInfrastructures(res.data.filter(infra => infra && infra.name));
    } catch (error) {
      console.error('Error loading infrastructures:', error);
      setInfrastructures([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // When from/to infrastructure changes, update path accordingly
    if (name === 'from_infrastructure_id' || name === 'to_infrastructure_id') {
      handleInfrastructureChange(name, value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get infrastructure coordinates (from infrastructure or its site)
  const getInfrastructureCoordinates = (infrastructureId) => {
    if (!infrastructureId) return null;
    const infra = infrastructures.find(i => i.id === parseInt(infrastructureId));
    if (!infra) return null;

    // Try infrastructure's own coordinates first
    let lat = parseFloat(infra.latitude);
    let lng = parseFloat(infra.longitude);

    // If null, try site coordinates
    if (isNaN(lat) || isNaN(lng)) {
      lat = parseFloat(infra.site?.latitude);
      lng = parseFloat(infra.site?.longitude);
    }

    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
    return null;
  };

  // Handle infrastructure selection and update path
  const handleInfrastructureChange = (field, value) => {
    const currentPath = formData.path_coordinates || [];

    if (!value) {
      // If clearing, just return - don't modify path automatically
      return;
    }

    const coords = getInfrastructureCoordinates(value);
    if (!coords) return;

    let newPath = [...currentPath];

    if (field === 'from_infrastructure_id') {
      // Set first point to from infrastructure
      if (newPath.length === 0) {
        newPath.push(coords);
      } else {
        newPath[0] = coords;
      }
    } else if (field === 'to_infrastructure_id') {
      // Set last point to to infrastructure
      if (newPath.length === 0) {
        newPath.push(coords);
      } else {
        newPath[newPath.length - 1] = coords;
      }
    }

    // Update path and recalculate length
    handleCablePathChange(newPath);
  };

  const handleCableTypeChange = (e) => {
    const cableTypeId = e.target.value;
    const selectedType = cableTypes.find(ct => ct.id === parseInt(cableTypeId));

    setFormData((prev) => ({
      ...prev,
      cable_type_id: cableTypeId,
      // Auto-set core_count from cable type's default
      core_count: selectedType ? selectedType.default_core_count : 0,
    }));
  };

  const handleCablePathChange = (pathCoordinates) => {
    // Calculate cable length
    let cableLength = 0;
    if (pathCoordinates.length >= 2) {
      for (let i = 0; i < pathCoordinates.length - 1; i++) {
        const from = pathCoordinates[i];
        const to = pathCoordinates[i + 1];
        const R = 6371000; // Earth radius in meters
        const lat1 = (from[0] * Math.PI) / 180;
        const lat2 = (to[0] * Math.PI) / 180;
        const deltaLat = ((to[0] - from[0]) * Math.PI) / 180;
        const deltaLng = ((to[1] - from[1]) * Math.PI) / 180;
        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        cableLength += R * c;
      }
    }

    setFormData((prev) => ({
      ...prev,
      path_coordinates: pathCoordinates.length > 0 ? pathCoordinates : null,
      length: Math.round(cableLength), // Round to nearest meter
    }));
  };

  const getSelectedCableType = () => {
    return cableTypes.find(ct => ct.id === parseInt(formData.cable_type_id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        // Convert path_coordinates array to JSON string if it exists
        path_coordinates: formData.path_coordinates
          ? JSON.stringify(formData.path_coordinates)
          : null,
        // Ensure numeric fields are numbers
        cable_type_id: parseInt(formData.cable_type_id),
        from_infrastructure_id: formData.from_infrastructure_id ? parseInt(formData.from_infrastructure_id) : null,
        to_infrastructure_id: formData.to_infrastructure_id ? parseInt(formData.to_infrastructure_id) : null,
        length: parseFloat(formData.length) || 0,
        core_count: parseInt(formData.core_count) || 0,
      };

      if (editingId) {
        await cableService.update(editingId, submitData);
      } else {
        await cableService.create(submitData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Error saving cable');
    } finally {
      setLoading(false);
    }
  };

  const selectedCableType = getSelectedCableType();

  // Filter only OTB, Joint Box, ODC, ODP for connection points
  const allowedTypes = ['otb', 'odc', 'odp', 'joint box', 'jointbox'];
  const filteredInfrastructures = infrastructures.filter(infra => {
    const typeName = (infra.type?.name || '').toLowerCase();
    return allowedTypes.some(t => typeName.includes(t));
  });

  // Group filtered infrastructures by type for better organization
  const groupedInfrastructures = filteredInfrastructures.reduce((acc, infra) => {
    const typeName = infra.type?.name || 'Other';
    if (!acc[typeName]) {
      acc[typeName] = [];
    }
    acc[typeName].push(infra);
    return acc;
  }, {});

  return (
    <div className="cable-form-wrapper">
      <form className="cable-form" onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <h4 className="section-title">Basic Information</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Cable Type *</label>
              <select
                name="cable_type_id"
                value={formData.cable_type_id}
                onChange={handleCableTypeChange}
                required
              >
                <option value="">Select Cable Type</option>
                {cableTypes.filter(t => t && t.id && t.name).map((type) => (
                  <option key={type.id} value={type.id}>
                    {String(type.name)} ({String(type.type || '')}, {type.default_core_count || 0} cores)
                  </option>
                ))}
              </select>
              {selectedCableType && (
                <div className="cable-type-info">
                  <span className="color-preview" style={{
                    backgroundColor: selectedCableType.color,
                    color: getContrastColor(selectedCableType.color),
                    border: '1px solid #ccc'
                  }}>
                    {selectedCableType.name}
                  </span>
                  <small>{selectedCableType.description}</small>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Cable Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Cable JKB-001 to ODP-001"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Core Count *</label>
              <input
                type="number"
                name="core_count"
                value={isNaN(formData.core_count) ? 0 : formData.core_count}
                onChange={handleChange}
                min="1"
                required
                readOnly
                title="Auto-filled from cable type"
                className="readonly-input"
              />
              <small className="field-hint">Auto-filled from cable type</small>
            </div>

            <div className="form-group">
              <label>Length (meters)</label>
              <input
                type="number"
                name="length"
                value={isNaN(formData.length) ? 0 : formData.length}
                onChange={handleChange}
                step="0.01"
                min="0"
                readOnly
                title="Auto-calculated from path"
                className="readonly-input"
              />
              <small className="field-hint">Auto-calculated from path</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g., Fujikura, Nexans"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4 className="section-title">Connection Points (Optional)</h4>
          <p className="section-description" style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
            Can be filled after splicing is done. Leave empty for cables that are still pending connection.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>From Infrastructure</label>
              <select
                name="from_infrastructure_id"
                value={formData.from_infrastructure_id}
                onChange={handleChange}
              >
                <option value="">Select Start Point (Optional)</option>
                {Object.entries(groupedInfrastructures).map(([typeName, infras]) => (
                  <optgroup key={typeName} label={typeName}>
                    {infras.map((infra) => (
                      <option key={infra.id} value={infra.id}>
                        {infra.name} ({infra.address || 'No address'})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>To Infrastructure</label>
              <select
                name="to_infrastructure_id"
                value={formData.to_infrastructure_id}
                onChange={handleChange}
              >
                <option value="">Select End Point (Optional)</option>
                {Object.entries(groupedInfrastructures).map(([typeName, infras]) => (
                  <optgroup key={typeName} label={typeName}>
                    {infras.map((infra) => (
                      <option key={infra.id} value={infra.id}>
                        {infra.name} ({infra.address || 'No address'})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4 className="section-title">Cable Path Drawing</h4>
          <p className="section-description">
            Draw the cable route on the map by clicking points along the path.
          </p>
          <CableDrawer
            onPathChange={handleCablePathChange}
            initialPath={formData.path_coordinates}
          />
          {Number(formData.length) > 0 && (
            <div className="length-display">
              <strong>Calculated Length:</strong> {(Number(formData.length) / 1000).toFixed(2)} km ({Number(formData.length).toFixed(0)} meters)
            </div>
          )}
        </div>

        <div className="form-section">
          <h4 className="section-title">Additional Information</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Installation Date</label>
              <input
                type="date"
                name="installation_date"
                value={formData.installation_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="planned">Planned</option>
                <option value="installed">Installed (Pending Splicing)</option>
                <option value="spliced">Spliced (Pending Activation)</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Additional notes about this cable..."
            />
          </div>
        </div>

        <div className="form-buttons">
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Saving...' : isEditMode ? 'Update Cable' : 'Create Cable'}
          </button>
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CableForm;
