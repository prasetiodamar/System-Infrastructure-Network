import React, { useState, useEffect } from 'react';
import { portService } from '../services/services';

const PortEditModal = ({ port, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    status: 'available',
    client_name: '',
    client_area: '',
    allocation_date: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (port) {
      setFormData({
        status: port.status || 'available',
        client_name: port.client_name || '',
        client_area: port.client_area || '',
        allocation_date: port.allocation_date || '',
        notes: port.notes || '',
      });
    }
  }, [port]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        status: formData.status,
        client_name: formData.status === 'allocated' ? formData.client_name : '',
        client_area: formData.status === 'allocated' ? formData.client_area : '',
        allocation_date: formData.status === 'allocated' ? formData.allocation_date : '',
        notes: formData.notes,
      };

      await portService.update(port.id, updateData);
      onSave();
    } catch (error) {
      console.error('Error updating port:', error);
      alert('Failed to save port');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: '12px', width: '90%', maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1f2937' }}>Port {port?.port_number}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Status */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                fontSize: '14px', background: 'white'
              }}
            >
              <option value="available">Available</option>
              <option value="allocated">Allocated</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* Allocation - Show when allocated */}
          {formData.status === 'allocated' && (
            <div style={{ marginBottom: '16px', padding: '16px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: '#0369a1' }}>Allocation</label>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>Client Name</label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  placeholder="Enter client name"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>Address</label>
                <input
                  type="text"
                  name="client_area"
                  value={formData.client_area}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>Start Date</label>
                <input
                  type="date"
                  name="allocation_date"
                  value={formData.allocation_date}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Additional notes..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical' }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '14px', color: '#374151' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PortEditModal;
