import React, { useState, useEffect } from 'react';
import { cableTypeService } from '../services/services';
import { Waypoints, Palette, Pencil, Trash2, Check } from 'lucide-react';
import './CableTypeManager.css';

// Helper to determine if text should be light or dark based on background
const getContrastColor = (hexColor) => {
  if (!hexColor) return '#000';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000' : '#fff';
};

// Preset colors for fiber cables - distinct and easily visible
const colorPresets = [
  { name: 'Biru', color: '#2196F3' },
  { name: 'Merah', color: '#E53935' },
  { name: 'Hijau', color: '#43A047' },
  { name: 'Kuning', color: '#FDD835' },
  { name: 'Ungu', color: '#8E24AA' },
  { name: 'Oranye', color: '#FB8C00' },
  { name: 'Hitam', color: '#1a1a1a' },
  { name: 'Pink', color: '#D81B60' },
  { name: 'Tosca', color: '#00ACC1' },
  { name: 'Coklat', color: '#6D4C41' },
  { name: 'Abu', color: '#607D8B' },
  { name: 'Biru Tua', color: '#1565C0' },
  { name: 'Merah Tua', color: '#C62828' },
  { name: 'Hijau Tua', color: '#2E7D32' },
  { name: 'Kuning Tua', color: '#F9A825' },
  { name: 'Ungu Tua', color: '#6A1B9A' },
];

const CableTypeManager = () => {
  const [cableTypes, setCableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Duct Cable',
    default_core_count: 12,
    description: '',
    color: '#2196F3',
    is_active: true,
    tube_count: 1,
    cores_per_tube: 12,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadCableTypes();
  }, []);

  const loadCableTypes = async () => {
    try {
      setLoading(true);
      const response = await cableTypeService.getAll();
      setCableTypes(response.data);
    } catch (error) {
      console.error('Error loading cable types:', error);
      setError('Failed to load cable types');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingType(null);
    setFormData({
      name: '',
      type: 'Duct Cable',
      default_core_count: 24,
      description: '',
      color: '#2196F3',
      is_active: true,
      tube_count: 2,
      cores_per_tube: 12,
    });
    setError('');
    setShowModal(true);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      type: type.type,
      default_core_count: type.default_core_count,
      description: type.description || '',
      color: type.color || '#2196F3',
      is_active: type.is_active,
      tube_count: type.tube_count || 1,
      cores_per_tube: type.cores_per_tube || 12,
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Convert numeric fields to proper types
      const submitData = {
        ...formData,
        default_core_count: parseInt(formData.default_core_count) || 24,
        tube_count: parseInt(formData.tube_count) || 1,
        cores_per_tube: parseInt(formData.cores_per_tube) || 12,
        is_active: Boolean(formData.is_active),
      };

      if (editingType) {
        await cableTypeService.update(editingType.id, submitData);
      } else {
        await cableTypeService.create(submitData);
      }
      setShowModal(false);
      loadCableTypes();
    } catch (error) {
      console.error('Error saving cable type:', error);
      const errorData = error.response?.data;
      if (errorData?.errors) {
        // Validation errors - show first error message
        const firstError = Object.values(errorData.errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        setError(errorData?.error || 'Failed to save cable type');
      }
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this cable type?')) {
      return;
    }

    try {
      await cableTypeService.delete(typeId);
      loadCableTypes();
    } catch (error) {
      console.error('Error deleting cable type:', error);
      alert(error.response?.data?.error || 'Failed to delete cable type');
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingType(null);
    setError('');
  };

  if (loading) {
    return <div className="cable-type-manager">Loading...</div>;
  }

  return (
    <div className="cable-type-manager">
      <div className="manager-header">
        <h2><Waypoints size={24} className="header-icon" /> Cable Types Management</h2>
        <button className="add-btn" onClick={handleAdd}>
          + Add Cable Type
        </button>
      </div>

      <div className="types-table-container">
        <table className="types-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Default Cores</th>
              <th>Tube Config</th>
              <th>Color</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cableTypes.filter(t => t && t.name).map((type) => (
              <tr key={type.id}>
                <td>{String(type.name)}</td>
                <td>{String(type.type || '')}</td>
                <td>{type.default_core_count}</td>
                <td>{type.tube_count || 1} Tube × {type.cores_per_tube || 12} Core</td>
                <td>
                  <span className="color-preview">
                    <span
                      className="color-dot"
                      style={{ backgroundColor: type.color }}
                    />
                    <span style={{ color: '#666', fontSize: '11px', fontWeight: 500 }}>
                      {type.color}
                    </span>
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${type.is_active ? 'active' : 'inactive'}`}>
                    {type.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="actions">
                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(type)}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="delete-btn"
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
              <h3>{editingType ? 'Edit Cable Type' : 'Add New Cable Type'}</h3>
              <button className="close-btn" onClick={handleCancel}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="cable-type-form">
              {error && (
                <div className="error-message">{error}</div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Duct Cable 12 Core"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="Duct Cable">Duct Cable</option>
                    <option value="Direct Buried Cable">Direct Buried Cable</option>
                    <option value="Aerial Cable">Aerial Cable</option>
                    <option value="Dropcore">Dropcore</option>
                    <option value="Dropcore Tube">Dropcore Tube</option>
                    <option value="Figure 8">Figure 8</option>
                    <option value="Mini ADSS">Mini ADSS</option>
                    <option value="ADSS">ADSS</option>
                    <option value="SCPT">SCPT</option>
                    <option value="Indoor Cable">Indoor Cable</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Default Core Count *</label>
                  <input
                    type="number"
                    value={formData.default_core_count}
                    onChange={(e) => setFormData({ ...formData, default_core_count: parseInt(e.target.value) })}
                    min="1"
                    max="288"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tube Configuration</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      value={formData.tube_count}
                      onChange={(e) => setFormData({ ...formData, tube_count: parseInt(e.target.value) })}
                      min="1"
                      max="24"
                      style={{ width: '80px', minWidth: '60px' }}
                    />
                    <span style={{ color: '#666' }}>tubes ×</span>
                    <input
                      type="number"
                      value={formData.cores_per_tube}
                      onChange={(e) => setFormData({ ...formData, cores_per_tube: parseInt(e.target.value) })}
                      min="1"
                      max="24"
                      style={{ width: '80px', minWidth: '60px' }}
                    />
                    <span style={{ color: '#666' }}>cores/tube</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label><Palette size={14} style={{marginRight: 6, verticalAlign: 'middle'}}/>Pilih Warna</label>
                <div style={{
                  background: '#f9fafb',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div className="color-preset-grid">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        className={`color-preset-btn ${formData.color === preset.color ? 'selected' : ''}`}
                        style={{
                          backgroundColor: preset.color,
                          border: formData.color === preset.color ? '3px solid #4f46e5' : '2px solid rgba(0,0,0,0.1)',
                        }}
                        onClick={() => setFormData({ ...formData, color: preset.color })}
                        title={preset.name}
                      >
                        {formData.color === preset.color && (
                          <Check size={14} color={getContrastColor(preset.color)} strokeWidth={3} />
                        )}
                      </button>
                    ))}
                  </div>
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    background: formData.color,
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: getContrastColor(formData.color),
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}>
                    {colorPresets.find(p => p.color === formData.color)?.name || formData.color}
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>Custom:</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}
                      title="Pick custom color"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#FF0000"
                      style={{ flex: 1, padding: '8px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />
                  </div>
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

export default CableTypeManager;
