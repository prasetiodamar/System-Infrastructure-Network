import React, { useState, useEffect } from 'react';
import { infrastructureTypeService } from '../services/services';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import './OTBTypeManager.css';

const OTBTypeManager = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    icon_url: null,
    description: '',
    port_count: 12,
    is_active: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const response = await infrastructureTypeService.getAll();
      // Filter only OTB types
      const otbTypes = response.data.filter(t => t.name.toLowerCase().includes('otb'));
      setTypes(otbTypes);
    } catch (error) {
      console.error('Error loading OTB types:', error);
      setError('Failed to load OTB types');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingType(null);
    setFormData({
      name: '',
      icon_url: null,
      description: '',
      port_count: 12,
      is_active: true,
    });
    setError('');
    setShowModal(true);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      icon_url: type.icon_url || null,
      description: type.description || '',
      port_count: parseInt(type.name.match(/\d+/)?.[0]) || 12,
      is_active: type.is_active ?? true,
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Add OTB prefix to name if not present
      const finalData = {
        name: formData.name.toLowerCase().includes('otb')
          ? formData.name
          : `OTB ${formData.port_count} Port`,
        description: formData.description,
        port_count: formData.port_count,
        is_active: formData.is_active,
      };

      if (editingType) {
        await infrastructureTypeService.update(editingType.id, finalData);
      } else {
        await infrastructureTypeService.create(finalData);
      }
      setShowModal(false);
      loadTypes();
    } catch (error) {
      console.error('Error saving OTB type:', error);
      setError(error.response?.data?.message || 'Failed to save OTB type');
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this OTB type?')) {
      return;
    }

    try {
      await infrastructureTypeService.delete(typeId);
      loadTypes();
    } catch (error) {
      console.error('Error deleting OTB type:', error);
      alert(error.response?.data?.message || 'Failed to delete OTB type');
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingType(null);
    setError('');
  };

  if (loading) {
    return <div className="otb-type-manager">Loading...</div>;
  }

  return (
    <div className="otb-type-manager">
      <div className="manager-header">
        <h2>OTB Types Management</h2>
        <button className="add-btn" onClick={handleAdd}>
          <Plus size={18} />
          Add OTB Type
        </button>
      </div>

      <div className="types-table-container">
        <table className="types-table">
          <thead>
            <tr>
              <th>Type Name</th>
              <th>Port Count</th>
              <th>Icon</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type.id}>
                <td>
                  <div className="type-name-cell">
                    <span className="type-name">{type.name}</span>
                    {type.description && (
                      <span className="type-description">{type.description}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="port-count-badge">
                    {type.name.match(/\d+/)?.[0] || '?'} Ports
                  </span>
                </td>
                <td>
                  <span className="icon-badge">{type.icon_url}</span>
                </td>
                <td>
                  <span className={`status-badge ${type.is_active ? 'active' : 'inactive'}`}>
                    {type.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="actions">
                  <button
                    className="action-btn edit-btn"
                    onClick={() => handleEdit(type)}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(type.id)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingType ? 'Edit OTB Type' : 'Add New OTB Type'}</h3>
              <button className="close-btn" onClick={handleCancel}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="otb-type-form">
              {error && (
                <div className="error-message">{error}</div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Port Count *</label>
                  <select
                    value={formData.port_count}
                    onChange={(e) => setFormData({ ...formData, port_count: parseInt(e.target.value) })}
                    required
                  >
                    <option value={12}>12 Port</option>
                    <option value={24}>24 Port</option>
                    <option value={48}>48 Port</option>
                    <option value={96}>96 Port</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Custom Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Leave blank to auto-generate name"
                  />
                  <small style={{ color: '#666' }}>Default: OTB {formData.port_count} Port</small>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                  rows="3"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div className="form-buttons">
                <button type="button" className="cancel-btn" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingType ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OTBTypeManager;
