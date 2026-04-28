import React, { useState, useEffect } from 'react';
import { splitterService, splitterPortService, cableService, infrastructureService, portService } from '../services/services';
import { Plus, X, Trash2, Pencil, Network, Link, Cable, ArrowRight } from 'lucide-react';
import './SplitterManager.css';

const SplitterManager = ({ infrastructure, onClose }) => {
  const [splitters, setSplitters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSplitter, setEditingSplitter] = useState(null);
  const [ratios, setRatios] = useState([
    { value: '1:2', label: '1:2 (2 Ports)', port_count: 2 },
    { value: '1:4', label: '1:4 (4 Ports)', port_count: 4 },
    { value: '1:8', label: '1:8 (8 Ports)', port_count: 8 },
    { value: '1:16', label: '1:16 (16 Ports)', port_count: 16 },
    { value: '1:32', label: '1:32 (32 Ports)', port_count: 32 },
  ]);
  const [cables, setCables] = useState([]);
  const [odps, setOdps] = useState([]);
  const [ports, setPorts] = useState([]);
  const [selectedSplitter, setSelectedSplitter] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    ratio: '1:8',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [infrastructure.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [splittersRes, ratiosRes, cablesRes, portsRes] = await Promise.all([
        splitterService.getByInfrastructure(infrastructure.id),
        splitterService.getRatios(),
        cableService.getAll(),
        portService.getByInfrastructure(infrastructure.id),
      ]);

      setSplitters(splittersRes.data);
      if (ratiosRes.data && ratiosRes.data.length > 0) {
        setRatios(ratiosRes.data);
      }
      setCables(cablesRes.data);
      setPorts(portsRes.data);

      // Filter ODPs (infrastructures that are ODP type)
      // For now, show all infrastructures except the current one
      const infraRes = await infrastructureService.getAll();
      const odpList = infraRes.data.filter(i =>
        i.id !== infrastructure.id &&
        i.type?.name?.toLowerCase().includes('odp')
      );
      setOdps(odpList);
    } catch (error) {
      console.error('Error loading splitter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSplitter) {
        await splitterService.update(editingSplitter.id, formData);
      } else {
        await splitterService.create({
          ...formData,
          infrastructure_id: infrastructure.id,
        });
      }
      setShowAddForm(false);
      setEditingSplitter(null);
      setFormData({ name: '', ratio: '1:8', notes: '' });
      loadData();
    } catch (error) {
      console.error('Error saving splitter:', error);
      alert('Failed to save splitter: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (splitter) => {
    setEditingSplitter(splitter);
    setFormData({
      name: splitter.name,
      ratio: splitter.ratio,
      notes: splitter.notes || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (splitterId) => {
    if (!window.confirm('Are you sure you want to delete this splitter? All port connections will be lost.')) {
      return;
    }
    try {
      await splitterService.delete(splitterId);
      loadData();
    } catch (error) {
      console.error('Error deleting splitter:', error);
      alert('Failed to delete splitter: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConnectPort = async (portId, connectionData) => {
    try {
      await splitterPortService.connect(portId, connectionData);
      loadData();
    } catch (error) {
      console.error('Error connecting port:', error);
      alert('Failed to connect port: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDisconnectPort = async (portId) => {
    try {
      await splitterPortService.disconnect(portId);
      loadData();
    } catch (error) {
      console.error('Error disconnecting port:', error);
      alert('Failed to disconnect port');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#22c55e';
      case 'reserved': return '#eab308';
      case 'used': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'reserved': return 'Reserved';
      case 'used': return 'Connected';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="splitter-manager">
        <div className="splitter-loading">Loading splitters...</div>
      </div>
    );
  }

  return (
    <div className="splitter-manager">
      <div className="splitter-header">
        <h3>
          <Network size={20} />
          Splitter Management - {infrastructure.name}
        </h3>
        <div className="splitter-header-actions">
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> Add Splitter
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            <X size={16} /> Close
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="splitter-form-container">
          <form onSubmit={handleSubmit} className="splitter-form">
            <h4>{editingSplitter ? 'Edit Splitter' : 'Add New Splitter'}</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Splitter Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., SPL-01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Ratio *</label>
                <select
                  value={formData.ratio}
                  onChange={(e) => setFormData({ ...formData, ratio: e.target.value })}
                >
                  {ratios.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingSplitter ? 'Update' : 'Create'} Splitter
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingSplitter(null);
                  setFormData({ name: '', ratio: '1:8', notes: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="splitters-list">
        {splitters.length === 0 ? (
          <div className="splitters-empty">
            <Network size={48} />
            <h4>No Splitters Found</h4>
            <p>Add your first splitter to start managing fiber connections.</p>
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
              <Plus size={16} /> Add First Splitter
            </button>
          </div>
        ) : (
          splitters.map((splitter) => (
            <div key={splitter.id} className="splitter-card">
              <div className="splitter-card-header">
                <div className="splitter-info">
                  <h4>{splitter.name}</h4>
                  <span className="splitter-ratio-badge">{splitter.ratio}</span>
                  {splitter.location && (
                    <span className="splitter-location">{splitter.location}</span>
                  )}
                </div>
                <div className="splitter-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(splitter)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(splitter.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="splitter-stats">
                <div className="stat-item available">
                  <span className="stat-count">{splitter.available_ports_count || 0}</span>
                  <span className="stat-label">Available</span>
                </div>
                <div className="stat-item used">
                  <span className="stat-count">{splitter.used_ports_count || 0}</span>
                  <span className="stat-label">Connected</span>
                </div>
              </div>

              <div className="splitter-ports-grid">
                {splitter.ports?.map((port) => (
                  <div
                    key={port.id}
                    className={`splitter-port ${port.status}`}
                    title={`Port ${port.port_number}`}
                  >
                    <span className="port-number">{port.port_number}</span>
                    {port.status === 'used' && (
                      <div className="port-connection-info">
                        <Cable size={10} />
                        <span className="core-number">C{port.core_number}</span>
                      </div>
                    )}
                    {port.destination && (
                      <div className="port-destination" title={port.destination.name}>
                        <ArrowRight size={10} />
                        <span>{port.destination.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedSplitter?.id === splitter.id && (
                <PortConnectionModal
                  port={selectedSplitter}
                  cables={cables}
                  odps={odps}
                  onConnect={handleConnectPort}
                  onDisconnect={handleDisconnectPort}
                  onClose={() => setSelectedSplitter(null)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Modal for connecting a splitter port to cable/ODP
const PortConnectionModal = ({ port, cables, odps, onConnect, onDisconnect, onClose }) => {
  const [formData, setFormData] = useState({
    cable_id: port.cable_id || '',
    core_number: port.core_number || '',
    destination_infrastructure_id: port.destination_infrastructure_id || '',
    notes: port.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onConnect(port.id, {
      ...formData,
      cable_id: formData.cable_id ? parseInt(formData.cable_id) : null,
      core_number: formData.core_number ? parseInt(formData.core_number) : null,
      destination_infrastructure_id: formData.destination_infrastructure_id ? parseInt(formData.destination_infrastructure_id) : null,
    });
  };

  const selectedCable = cables.find(c => c.id === parseInt(formData.cable_id));

  return (
    <div className="port-modal-overlay" onClick={onClose}>
      <div className="port-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="port-modal-header">
          <h4>Connect Port {port.port_number}</h4>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="port-modal-form">
          <div className="form-group">
            <label>Distribution Cable *</label>
            <select
              value={formData.cable_id}
              onChange={(e) => setFormData({ ...formData, cable_id: e.target.value, core_number: '' })}
              required
            >
              <option value="">Select Cable...</option>
              {cables.map((cable) => (
                <option key={cable.id} value={cable.id}>
                  {cable.name} ({cable.core_count}C)
                </option>
              ))}
            </select>
          </div>

          {selectedCable && (
            <div className="form-group">
              <label>Core Number * (Max: {selectedCable.core_count})</label>
              <select
                value={formData.core_number}
                onChange={(e) => setFormData({ ...formData, core_number: e.target.value })}
                required
              >
                <option value="">Select Core...</option>
                {Array.from({ length: selectedCable.core_count }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    Core {num}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Destination ODP (Optional)</label>
            <select
              value={formData.destination_infrastructure_id}
              onChange={(e) => setFormData({ ...formData, destination_infrastructure_id: e.target.value })}
            >
              <option value="">Select ODP...</option>
              {odps.map((odp) => (
                <option key={odp.id} value={odp.id}>
                  {odp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <Link size={14} /> Connect Port
            </button>
            {port.status === 'used' && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onDisconnect(port.id)}
              >
                Disconnect
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SplitterManager;
