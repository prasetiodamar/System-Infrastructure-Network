import React, { useState, useEffect } from 'react';
import { coreService } from '../services/services';

const CoreEditModal = ({ core, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    status: 'available',
    client_name: '',
    client_area: '',
    allocation_date: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (core) {
      setFormData({
        status: core.status || 'available',
        client_name: core.client_name || '',
        client_area: core.client_area || '',
        allocation_date: core.allocation_date || '',
        notes: core.notes || '',
      });
    }
  }, [core]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await coreService.update(core.id, formData);
      onSave();
    } catch (error) {
      console.error('Error updating core:', error);
      alert('Gagal menyimpan data core');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#22c55e',
      allocated: '#3b82f6',
      spliced: '#f59e0b',
      damaged: '#ef4444',
      reserved: '#8b5cf6',
    };
    return colors[status] || '#6b7280';
  };

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1001,
  };

  const modalStyle = {
    background: 'white', borderRadius: '12px', width: '95%',
    maxWidth: '400px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  };

  const headerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
  };

  const labelStyle = {
    display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#374151',
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: '14px',
    border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box',
    outline: 'none', transition: 'border-color 0.2s',
  };

  const selectStyle = {
    ...inputStyle, cursor: 'pointer',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '8px',
              background: getStatusColor(formData.status), color: 'white',
              fontWeight: 700, fontSize: '16px',
            }}>
              {core?.core_number}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                Edit Core {core?.core_number}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                Cable ID: {core?.cable_id}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
            color: '#9ca3af', padding: 0, width: '28px', height: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '4px',
          }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>

          {/* Status */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              style={{
                ...selectStyle,
                borderColor: getStatusColor(formData.status),
                background: `${getStatusColor(formData.status)}10`,
              }}
            >
              <option value="available">Available</option>
              <option value="allocated">Allocated</option>
              <option value="spliced">Spliced</option>
              <option value="damaged">Damaged</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>

          {/* Client Fields - show when allocated */}
          {formData.status === 'allocated' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Nama Client</label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required={formData.status === 'allocated'}
                  placeholder="Masukkan nama client"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Area/Daerah</label>
                <input
                  type="text"
                  name="client_area"
                  value={formData.client_area}
                  onChange={handleChange}
                  required={formData.status === 'allocated'}
                  placeholder="Masukkan area client"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Tanggal Mulai</label>
                <input
                  type="date"
                  name="allocation_date"
                  value={formData.allocation_date}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Catatan</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Catatan tambahan (opsional)"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '8px',
                backgroundColor: 'white', color: '#374151', cursor: 'pointer',
                fontSize: '14px', fontWeight: 500,
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 24px', border: 'none', borderRadius: '8px',
                backgroundColor: '#22c55e', color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoreEditModal;
