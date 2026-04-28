import React, { useState, useEffect } from 'react';
import { infrastructureService, infrastructureTypeService, cableService, spliceService, odcTypeService, odpTypeService } from '../services/services';
import MapPicker from './MapPicker';
import CableDrawer from './CableDrawer';
import './InfrastructureForm.css';

const InfrastructureForm = ({ onSave, onCancel, editingId, preSelectedTypeId, typeName }) => {
  const [types, setTypes] = useState([]);
  const [odcTypes, setOdcTypes] = useState([]);
  const [odpTypes, setOdpTypes] = useState([]);
  const [pops, setPops] = useState([]);
  const [cables, setCables] = useState([]);
  const [availableCores, setAvailableCores] = useState([]);
  const [formData, setFormData] = useState({
    type_id: preSelectedTypeId ? preSelectedTypeId.toString() : '',
    odc_type_id: '',
    odp_type_id: '',
    name: '',
    latitude: '',
    longitude: '',
    path_coordinates: null,
    cable_length: 0,
    description: '',
    status: 'active',
    pop_id: '',
    cable_id: '',
    used_cores: [],
    site_id: '',
    rack_id: '',
    u_position: '',
    parent_id: '',
    hierarchy_level: 'access',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [jointBoxSplices, setJointBoxSplices] = useState([]);
  const [connectedCables, setConnectedCables] = useState([]);
  const [splicesLoading, setSplicesLoading] = useState(false);

  useEffect(() => {
    loadTypes();
    loadOdcTypes();
    loadOdpTypes();
    loadPOPs();
    loadCables();
    // If editing, load the infrastructure data
    if (editingId) {
      loadInfrastructureData(editingId);
      setIsEditMode(true);
    }
  }, [editingId]);

  // Load Joint Box data (splices and connected cables) when editing
  useEffect(() => {
    // Check if it's a Joint Box by type name or by form data
    const isJB = isJointBoxType();
    console.log('Joint Box check:', { isJB, isEditMode, editingId, typeName, formDataTypeId: formData.type_id });

    if (isEditMode && editingId) {
      // Check if this is a Joint Box by looking at type
      const typeId = formData.type_id;
      if (typeId) {
        const selectedType = types.find(t => t.id === parseInt(typeId));
        const isJointBox = selectedType?.name?.toLowerCase().includes('joint box');
        if (isJointBox) {
          loadJointBoxData(editingId);
        }
      }
    }
  }, [isEditMode, editingId, formData.type_id, types]);

  // Load cables for selected POP
  useEffect(() => {
    if (formData.pop_id) {
      loadCablesForPOP(formData.pop_id);
    } else {
      setCables([]);
      setFormData(prev => ({ ...prev, cable_id: '', used_cores: [] }));
    }
  }, [formData.pop_id]);

  // Load available cores when cable is selected
  useEffect(() => {
    if (formData.cable_id) {
      loadCoresForCable(formData.cable_id);
    } else {
      setAvailableCores([]);
      setFormData(prev => ({ ...prev, used_cores: [] }));
    }
  }, [formData.cable_id]);

  const loadInfrastructureData = async (id) => {
    try {
      setLoading(true);
      const res = await infrastructureService.getAll();
      const infrastructure = res.data.find(item => item.id === id);
      
      if (infrastructure) {
        // Parse path_coordinates if it's a JSON string
        let pathCoordinates = null;
        if (infrastructure.path_coordinates) {
          try {
            pathCoordinates = typeof infrastructure.path_coordinates === 'string'
              ? JSON.parse(infrastructure.path_coordinates)
              : infrastructure.path_coordinates;
          } catch (e) {
            console.warn('Could not parse path_coordinates:', e);
          }
        }

        // Ensure cable_length is a number
        const cableLength = infrastructure.cable_length ? parseFloat(infrastructure.cable_length) : 0;
        
        // Ensure latitude and longitude are numbers
        const lat = infrastructure.latitude ? parseFloat(infrastructure.latitude) : '';
        const lng = infrastructure.longitude ? parseFloat(infrastructure.longitude) : '';

        setFormData({
          type_id: infrastructure.type_id.toString(),
          odc_type_id: infrastructure.odc_type_id?.toString() || '',
          odp_type_id: infrastructure.odp_type_id?.toString() || '',
          name: infrastructure.name,
          latitude: lat,
          longitude: lng,
          path_coordinates: pathCoordinates,
          cable_length: cableLength,
          description: infrastructure.description || '',
          status: infrastructure.status || 'active',
          pop_id: infrastructure.pop_id?.toString() || '',
          cable_id: infrastructure.cable_id?.toString() || '',
          used_cores: infrastructure.used_cores || [],
          site_id: infrastructure.site_id?.toString() || '',
          parent_id: infrastructure.parent_id?.toString() || '',
          hierarchy_level: infrastructure.hierarchy_level || 'access',
        });

        // Check if this is a Joint Box and load related data
        // Use infrastructure.type.name from API response (no need to wait for types array)
        const infraTypeName = infrastructure.type?.name?.toLowerCase() || '';
        if (infraTypeName.includes('joint box') || infraTypeName.includes('jointbox')) {
          loadJointBoxData(id);
        }
      }
    } catch (error) {
      console.error('Error loading infrastructure:', error);
      setError('Failed to load infrastructure data');
    } finally {
      setLoading(false);
    }
  };

  const loadTypes = async () => {
    try {
      const res = await infrastructureTypeService.getAll();
      setTypes(res.data);
    } catch (error) {
      console.error('Error loading types:', error);
    }
  };

  const loadOdcTypes = async () => {
    try {
      const res = await odcTypeService.getAll();
      setOdcTypes(res.data);
    } catch (error) {
      console.error('Error loading ODC types:', error);
    }
  };

  const loadOdpTypes = async () => {
    try {
      const res = await odpTypeService.getAll();
      setOdpTypes(res.data);
    } catch (error) {
      console.error('Error loading ODP types:', error);
    }
  };

  const loadPOPs = async () => {
    try {
      const res = await infrastructureService.getAll();
      console.log('All infrastructures:', res.data);
      // Filter hanya POP dan Data Center
      const popInfrastructures = res.data.filter(infra =>
        infra.type?.name?.toLowerCase() === 'pop' ||
        infra.type?.name?.toLowerCase().includes('data center')
      );
      console.log('Filtered POPs:', popInfrastructures);
      setPops(popInfrastructures);
    } catch (error) {
      console.error('Error loading POPs:', error);
    }
  };

  const loadCables = async () => {
    try {
      const res = await cableService.getAll();
      setCables(res.data);
    } catch (error) {
      console.error('Error loading cables:', error);
    }
  };

  const loadCablesForPOP = async (popId) => {
    try {
      const res = await cableService.getAll();
      // Filter cables that start from the selected POP
      const popCables = res.data.filter(cable =>
        cable.from_infrastructure_id === parseInt(popId)
      );
      setCables(popCables);
    } catch (error) {
      console.error('Error loading cables for POP:', error);
    }
  };

  const loadCoresForCable = async (cableId) => {
    try {
      const res = await cableService.cores(cableId);
      // Filter cores that are not used or available
      const cores = res.data || [];
      setAvailableCores(cores);
    } catch (error) {
      console.error('Error loading cores:', error);
    }
  };

  // Load splices and connected cables for Joint Box
  const loadJointBoxData = async (id) => {
    console.log('Loading Joint Box data for ID:', id);

    try {
      setSplicesLoading(true);

      // Load splices
      const spliceRes = await spliceService.getByJointBox(id);
      const splicesData = spliceRes.data || [];
      setJointBoxSplices(splicesData);
      console.log('Splices loaded:', splicesData);

      // Load all cables to find connected ones
      const cableRes = await cableService.getAll();
      const allCables = cableRes.data || [];
      console.log('All cables:', allCables);

      // Find cables that are connected to this joint box
      // A cable is connected if it starts or ends at this infrastructure
      const connected = allCables.filter(cable => {
        const fromInfra = parseInt(cable.from_infrastructure_id);
        const toInfra = parseInt(cable.to_infrastructure_id);
        const infraId = parseInt(id);
        return fromInfra === infraId || toInfra === infraId;
      });

      console.log('Connected cables:', connected);
      setConnectedCables(connected);
    } catch (error) {
      console.error('Error loading joint box data:', error);
    } finally {
      setSplicesLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationSelect = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handleCablePathChange = (pathCoordinates) => {
    // Calculate cable length
    let cableLength = 0;
    if (pathCoordinates.length >= 2) {
      for (let i = 0; i < pathCoordinates.length - 1; i++) {
        const from = pathCoordinates[i];
        const to = pathCoordinates[i + 1];
        // Simple distance calculation (Haversine formula would be more accurate)
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

    // Set first point as lat/lng if available
    const firstPoint = pathCoordinates.length > 0 ? pathCoordinates[0] : null;

    setFormData((prev) => ({
      ...prev,
      path_coordinates: pathCoordinates.length > 0 ? pathCoordinates : null,
      cable_length: cableLength,
      latitude: firstPoint ? firstPoint[0] : prev.latitude,
      longitude: firstPoint ? firstPoint[1] : prev.longitude,
    }));
  };

  const getSelectedTypeName = () => {
    const selectedType = types.find((t) => t.id === parseInt(formData.type_id));
    return selectedType ? selectedType.name : '';
  };

  // Check if current type is OTB (from props or selected)
  const isOtbType = () => {
    const name = typeName || getSelectedTypeName();
    return name.toLowerCase().includes('otb');
  };

  // Check if current type is ODC (from props or selected)
  const isOdcType = () => {
    const name = typeName || getSelectedTypeName();
    return name.toLowerCase().includes('odc');
  };

  // Check if current type is ODP (from props or selected)
  const isOdpType = () => {
    const name = typeName || getSelectedTypeName();
    return name.toLowerCase().includes('odp');
  };

  // Check if current type is Joint Box (from props, form data, or selected type)
  const isJointBoxType = () => {
    console.log('isJointBoxType check - typeName:', typeName, 'formData.type_id:', formData.type_id);

    // First check typeName prop (handles "joint-box", "joint box", "jointbox", "splice")
    if (typeName) {
      const tn = typeName.toLowerCase();
      if (tn.includes('joint') || tn.includes('splice')) return true;
    }

    // Then check selected type from form data
    const selectedType = getSelectedTypeName();
    if (selectedType) {
      const st = selectedType.toLowerCase();
      if (st.includes('joint') || st.includes('splice')) return true;
    }

    // Finally check types array using type_id from formData
    if (formData.type_id && types.length > 0) {
      const type = types.find(t => t.id === parseInt(formData.type_id));
      if (type && type.name) {
        const tn = type.name.toLowerCase();
        return tn.includes('joint') || tn.includes('splice');
      }
    }

    return false;
  };

  const isCableType = getSelectedTypeName() === 'Kabel';
  const hasPreSelectedType = preSelectedTypeId !== null && preSelectedTypeId !== undefined && preSelectedTypeId > 0;

  // Debug: check if typeName is passed correctly
  console.log('InfrastructureForm props:', { preSelectedTypeId, typeName, hasPreSelectedType });

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
      };

      if (editingId) {
        await infrastructureService.update(editingId, submitData);
      } else {
        await infrastructureService.create(submitData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving infrastructure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="olt-form-container">
      <div className="cable-form">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

      {!hasPreSelectedType && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Infrastructure Type *</label>
              <select
                name="type_id"
                value={formData.type_id}
                onChange={(e) => {
                  handleChange(e);
                  // Reset OTB-specific fields when type changes
                  setFormData(prev => ({
                    ...prev,
                    pop_id: '',
                    cable_id: '',
                    used_cores: []
                  }));
                }}
                required
              >
                <option value="">Select Type</option>
                {types
                  .filter(type => {
                    // If typeName is provided, only show matching types
                    if (typeName === 'otb') {
                      return type.name.toLowerCase().includes('otb');
                    }
                    if (typeName === 'odc') {
                      return type.name.toLowerCase().includes('odc');
                    }
                    return true;
                  })
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
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
              />
            </div>
          </div>

          {/* ODC Type Selection */}
          {isOdcType() && (
            <div className="form-row">
              <div className="form-group">
                <label>ODC Type *</label>
                <select
                  name="odc_type_id"
                  value={formData.odc_type_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select ODC Type</option>
                  {odcTypes.map((odcType) => (
                    <option key={odcType.id} value={odcType.id}>
                      {odcType.name} ({odcType.port_count} Ports)
                    </option>
                  ))}
                </select>
                {odcTypes.length === 0 && <small style={{color: '#999'}}>No ODC types available</small>}
              </div>
            </div>
          )}

          {/* ODP Type Selection */}
          {isOdpType() && (
            <div className="form-row">
              <div className="form-group">
                <label>ODP Type *</label>
                <select
                  name="odp_type_id"
                  value={formData.odp_type_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select ODP Type</option>
                  {odpTypes.map((odpType) => (
                    <option key={odpType.id} value={odpType.id}>
                      {odpType.name} ({odpType.port_count} Ports)
                    </option>
                  ))}
                </select>
                {odpTypes.length === 0 && <small style={{color: '#999'}}>No ODP types available</small>}
              </div>
            </div>
          )}

          {/* OTB-specific fields: Source (POP/Data Center) - shown when typeName=otb */}
          {typeName === 'otb' && (
            <div className="form-row">
              <div className="form-group">
                <label>Source (POP/Data Center) *</label>
                <select
                  name="pop_id"
                  value={formData.pop_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Source</option>
                  {pops.map((pop) => (
                    <option key={pop.id} value={pop.id}>
                      {pop.name} ({pop.type?.name})
                    </option>
                  ))}
                </select>
                {pops.length === 0 && <small style={{color: '#999'}}>No POP/Data Center found</small>}
              </div>
            </div>
          )}

          {/* OTB-specific fields: Cable, Cores */}
          {isOtbType() && (
            <>
              {formData.pop_id && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Cable</label>
                    <select
                      name="cable_id"
                      value={formData.cable_id}
                      onChange={(e) => {
                        handleChange(e);
                        // Reset cores when cable changes
                        setFormData(prev => ({ ...prev, used_cores: [] }));
                      }}
                    >
                      <option value="">Select Cable</option>
                      {cables.map((cable) => (
                        <option key={cable.id} value={cable.id}>
                          {cable.name} ({cable.core_count} cores)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {formData.cable_id && availableCores.length > 0 && (
                <div className="form-group">
                  <label>Used Cores</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                    gap: '8px',
                    marginTop: '8px',
                    padding: '12px',
                    background: '#f5f5f5',
                    borderRadius: '6px',
                    border: '1px solid #ddd'
                  }}>
                    {availableCores.map((core) => (
                      <label
                        key={core.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '8px',
                          background: formData.used_cores.includes(core.core_number)
                            ? '#2196F3'
                            : core.status === 'used'
                              ? '#f44336'
                              : 'white',
                          color: formData.used_cores.includes(core.core_number)
                            ? 'white'
                            : core.status === 'used'
                              ? 'white'
                              : '#333',
                          borderRadius: '4px',
                          cursor: core.status === 'used' ? 'not-allowed' : 'pointer',
                          border: '1px solid #ddd',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.used_cores.includes(core.core_number)}
                          disabled={core.status === 'used'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                used_cores: [...prev.used_cores, core.core_number]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                used_cores: prev.used_cores.filter(c => c !== core.core_number)
                              }));
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        {core.core_number}
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                    {formData.used_cores.length > 0
                      ? `Selected: ${formData.used_cores.sort((a,b) => a-b).join(', ')}`
                      : 'Select cores to use'}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {hasPreSelectedType && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <div className="type-display">
                {getSelectedTypeName()}
              </div>
            </div>

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* ODC Type Selection when typeName is ODC */}
          {typeName === 'odc' && (
            <div className="form-row">
              <div className="form-group">
                <label>ODC Type *</label>
                <select
                  name="odc_type_id"
                  value={formData.odc_type_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select ODC Type</option>
                  {odcTypes.map((odcType) => (
                    <option key={odcType.id} value={odcType.id}>
                      {odcType.name} ({odcType.port_count} Ports)
                    </option>
                  ))}
                </select>
                {odcTypes.length === 0 && <small style={{color: '#999'}}>No ODC types available</small>}
              </div>
            </div>
          )}

          {/* ODP Type Selection when typeName is ODP */}
          {typeName === 'odp' && (
            <div className="form-row">
              <div className="form-group">
                <label>ODP Type *</label>
                <select
                  name="odp_type_id"
                  value={formData.odp_type_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select ODP Type</option>
                  {odpTypes.map((odpType) => (
                    <option key={odpType.id} value={odpType.id}>
                      {odpType.name} ({odpType.port_count} Ports)
                    </option>
                  ))}
                </select>
                {odpTypes.length === 0 && <small style={{color: '#999'}}>No ODP types available</small>}
              </div>
            </div>
          )}

          {/* OTB-specific fields: Source (POP/Data Center) - shown when typeName=otb */}
          {typeName === 'otb' && (
            <div className="form-row">
              <div className="form-group">
                <label>Source (POP/Data Center) *</label>
                <select
                  name="pop_id"
                  value={formData.pop_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Source</option>
                  {pops.map((pop) => (
                    <option key={pop.id} value={pop.id}>
                      {pop.name} ({pop.type?.name})
                    </option>
                  ))}
                </select>
                {pops.length === 0 && <small style={{color: '#999'}}>No POP/Data Center found</small>}
              </div>
            </div>
          )}

          {/* OTB-specific fields: Cable, Cores */}
          {isOtbType() && (
            <>
              {formData.pop_id && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Cable</label>
                    <select
                      name="cable_id"
                      value={formData.cable_id}
                      onChange={(e) => {
                        handleChange(e);
                        // Reset cores when cable changes
                        setFormData(prev => ({ ...prev, used_cores: [] }));
                      }}
                    >
                      <option value="">Select Cable</option>
                      {cables.map((cable) => (
                        <option key={cable.id} value={cable.id}>
                          {cable.name} ({cable.core_count} cores)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {formData.cable_id && availableCores.length > 0 && (
                <div className="form-group">
                  <label>Used Cores</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                    gap: '8px',
                    marginTop: '8px',
                    padding: '12px',
                    background: '#f5f5f5',
                    borderRadius: '6px',
                    border: '1px solid #ddd'
                  }}>
                    {availableCores.map((core) => (
                      <label
                        key={core.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '8px',
                          background: formData.used_cores.includes(core.core_number)
                            ? '#2196F3'
                            : core.status === 'used'
                              ? '#f44336'
                              : 'white',
                          color: formData.used_cores.includes(core.core_number)
                            ? 'white'
                            : core.status === 'used'
                              ? 'white'
                              : '#333',
                          borderRadius: '4px',
                          cursor: core.status === 'used' ? 'not-allowed' : 'pointer',
                          border: '1px solid #ddd',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.used_cores.includes(core.core_number)}
                          disabled={core.status === 'used'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                used_cores: [...prev.used_cores, core.core_number]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                used_cores: prev.used_cores.filter(c => c !== core.core_number)
                              }));
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        {core.core_number}
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                    {formData.used_cores.length > 0
                      ? `Selected: ${formData.used_cores.sort((a,b) => a-b).join(', ')}`
                      : 'Select cores to use'}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {isCableType ? (
        <div className="cable-section">
          <h4 style={{ marginBottom: '10px', color: '#333' }}>Cable Path Drawing</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Draw the cable route on the map by clicking points along the path.
          </p>
          <CableDrawer
            onPathChange={handleCablePathChange}
            initialPath={formData.path_coordinates}
          />
          {typeof formData.cable_length === 'number' && formData.cable_length > 0 && (
            <div style={{ marginTop: '10px', padding: '10px', background: '#e8f5e9', borderRadius: '4px' }}>
              <strong>Cable Length:</strong> {(formData.cable_length / 1000).toFixed(2)} km ({formData.cable_length.toFixed(0)} meters)
            </div>
          )}
        </div>
      ) : (
        <div className="form-section">
          <h4 className="section-title">Location</h4>
          <p className="section-description">
            Click on the map to select location or enter coordinates manually.
          </p>

          {/* Embedded Map */}
          <div style={{ marginBottom: '15px' }}>
            <MapPicker
              onLocationSelect={(location) => {
                handleLocationSelect(location.lat, location.lng);
              }}
              initialLocation={
                formData.latitude && formData.longitude
                  ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
                  : null
              }
              readOnly={false}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Latitude *</label>
              <input
                type="number"
                name="latitude"
                step="0.000001"
                value={formData.latitude}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Longitude *</label>
              <input
                type="number"
                name="longitude"
                step="0.000001"
                value={formData.longitude}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Joint Box specific info */}
      {isJointBoxType() && (
        <div className="form-section" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
          <div className="form-section-title" style={{ color: '#ea580c' }}>
            Joint Box Information
          </div>

          {splicesLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              Loading data...
            </div>
          ) : isEditMode ? (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  background: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #fed7aa'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>
                    {jointBoxSplices.length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Splices</div>
                </div>
                <div style={{
                  background: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #fed7aa'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0ea5e9' }}>
                    {connectedCables.length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Connected Cables</div>
                </div>
              </div>

              {/* Connected Cables */}
              {connectedCables.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Kabel Terhubung
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {connectedCables.map(cable => (
                      <div
                        key={cable.id}
                        style={{
                          background: 'white',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>
                            {cable.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {cable.cable_type?.name} | {cable.core_count} cores
                          </div>
                        </div>
                        <div style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: cable.status === 'active' ? '#dcfce7' : '#fef3c7',
                          color: cable.status === 'active' ? '#166534' : '#92400e'
                        }}>
                          {cable.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Splices */}
              {jointBoxSplices.length > 0 && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Recent Splices
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {jointBoxSplices.slice(0, 3).map(splice => (
                      <div
                        key={splice.id}
                        style={{
                          background: 'white',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          fontSize: '12px'
                        }}
                      >
                        <span style={{ fontWeight: '600' }}>Core {splice.cable_1_core}</span>
                        <span style={{ margin: '0 8px', color: '#9ca3af' }}>→</span>
                        <span style={{ fontWeight: '600' }}>Core {splice.cable_2_core}</span>
                        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '11px' }}>
                          {splice.splice_type}
                        </span>
                      </div>
                    ))}
                    {jointBoxSplices.length > 3 && (
                      <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                        +{jointBoxSplices.length - 3} more splices
                      </div>
                    )}
                  </div>
                </div>
              )}

              {jointBoxSplices.length === 0 && connectedCables.length === 0 && (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0' }}>
                  Belum ada kabel atau splice yang terhubung. Tambahkan splice melalui fitur Splice Management.
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px 0' }}>
              Joint Box digunakan untuk menyambungkan (splice) kabel fiber. Setelah membuat Joint Box, Anda dapat mengelola splice melalui tombol "Splices".
            </p>
          )}
        </div>
      )}

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      <div className="form-buttons">
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
      </div>
        </form>
      </div>
    </div>
  );
};

export default InfrastructureForm;
