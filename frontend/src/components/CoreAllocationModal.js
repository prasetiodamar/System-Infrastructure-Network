import React, { useState, useEffect } from 'react';
import { cableService, coreService } from '../services/services';

const CoreAllocationModal = ({ cable, onClose }) => {
  const [cores, setCores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCore, setEditingCore] = useState(null);
  const [editForm, setEditForm] = useState({
    client_name: '',
    client_area: '',
    status: 'available',
    notes: '',
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadCores();
  }, [cable?.id]);

  const loadCores = async () => {
    try {
      setLoading(true);
      const response = await cableService.getCores(cable.id);
      setCores(response.data);
    } catch (error) {
      console.error('Error loading cores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (core) => {
    setEditingCore(core.id);
    setEditForm({
      client_name: core.client_name || '',
      client_area: core.client_area || '',
      status: core.status || 'available',
      notes: core.notes || '',
    });
  };

  const handleSave = async (coreId) => {
    try {
      setSaving(true);
      await coreService.update(coreId, editForm);
      await loadCores();
      setEditingCore(null);
    } catch (error) {
      console.error('Error saving core:', error);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingCore(null);
    setEditForm({ client_name: '', client_area: '', status: 'available', notes: '' });
  };

  const getStatusColor = (status) => {
    const colors = { available: '#22c55e', allocated: '#3b82f6', spliced: '#f59e0b', damaged: '#ef4444', reserved: '#8b5cf6' };
    return colors[status] || '#6b7280';
  };

  const getStatusBg = (status) => {
    const colors = { available: '#f0fdf4', allocated: '#eff6ff', spliced: '#fffbeb', damaged: '#fef2f2', reserved: '#f5f3ff' };
    return colors[status] || '#f9fafb';
  };

  const getStatusBorder = (status) => {
    const colors = { available: '#22c55e', allocated: '#3b82f6', spliced: '#f59e0b', damaged: '#ef4444', reserved: '#8b5cf6' };
    return colors[status] || '#d1d5db';
  };

  const getStatusLabel = (status) => {
    const labels = { available: 'AVL', allocated: 'ALL', spliced: 'SPL', damaged: 'DMG', reserved: 'RSV' };
    return labels[status] || 'N/A';
  };

  const filteredCores = cores.filter(c => filter === 'all' || c.status === filter);

  const statusCounts = {
    all: cores.length,
    available: cores.filter(c => c.status === 'available').length,
    allocated: cores.filter(c => c.status === 'allocated').length,
    spliced: cores.filter(c => c.status === 'spliced').length,
    damaged: cores.filter(c => c.status === 'damaged').length,
    reserved: cores.filter(c => c.status === 'reserved').length,
  };

  const coresPerRow = 12;
  const rows = [];
  for (let i = 0; i < filteredCores.length; i += coresPerRow) {
    rows.push(filteredCores.slice(i, i + coresPerRow));
  }

  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  };

  const modalStyle = {
    background: 'white', borderRadius: '12px', width: '95%',
    maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', overflow: 'hidden',
  };

  const headerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
  };

  const summaryStyle = {
    display: 'flex', gap: '12px', padding: '16px 24px', background: '#fff',
    borderBottom: '1px solid #e5e7eb',
  };

  const summaryItemStyle = (bg) => ({
    flex: 1, padding: '12px', borderRadius: '8px', textAlign: 'center',
    background: bg, borderTop: `3px solid ${bg === '#f3f4f6' ? '#6b7280' : getStatusColor(bg === '#dcfce7' ? 'available' : bg === '#dbeafe' ? 'allocated' : bg === '#fef3c7' ? 'spliced' : 'damaged')}`,
  });

  const filtersStyle = {
    display: 'flex', gap: '8px', padding: '12px 24px', background: '#fff',
    borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap',
  };

  const filterBtnStyle = (status, isActive) => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
    border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '12px',
    fontWeight: 500, whiteSpace: 'nowrap',
    background: isActive ? (status === 'all' ? '#1f2937' : getStatusColor(status)) : '#f3f4f6',
    color: isActive ? 'white' : '#6b7280',
  });

  const bodyStyle = {
    flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f9fafb',
  };

  const rowLabelStyle = {
    fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px',
  };

  const cardsGridStyle = {
    display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px',
  };

  const cardStyle = (status) => ({
    background: getStatusBg(status), borderRadius: '8px', padding: '12px 8px',
    border: `2px solid ${getStatusBorder(status)}`, cursor: 'pointer',
    textAlign: 'center', transition: 'all 0.15s', minHeight: '90px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>{cable?.name}</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{cores.length} Cores</p>
          </div>
          <button style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#9ca3af', padding: 0, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} onClick={onClose}>×</button>
        </div>

        {/* Summary */}
        <div style={summaryStyle}>
          <div style={summaryItemStyle('#f3f4f6')}>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: 600, color: '#1f2937' }}>{statusCounts.all}</span>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginTop: '2px' }}>Total</span>
          </div>
          <div style={summaryItemStyle('#dcfce7')}>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: 600, color: '#16a34a' }}>{statusCounts.available}</span>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', marginTop: '2px' }}>Available</span>
          </div>
          <div style={summaryItemStyle('#dbeafe')}>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: 600, color: '#2563eb' }}>{statusCounts.allocated}</span>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', marginTop: '2px' }}>Allocated</span>
          </div>
          <div style={summaryItemStyle('#fef3c7')}>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: 600, color: '#d97706' }}>{statusCounts.spliced}</span>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#d97706', textTransform: 'uppercase', marginTop: '2px' }}>Spliced</span>
          </div>
          <div style={summaryItemStyle('#fee2e2')}>
            <span style={{ display: 'block', fontSize: '24px', fontWeight: 600, color: '#dc2626' }}>{statusCounts.damaged}</span>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', marginTop: '2px' }}>Damaged</span>
          </div>
        </div>

        {/* Filters */}
        <div style={filtersStyle}>
          {['all', 'available', 'allocated', 'spliced', 'damaged', 'reserved'].map(status => (
            <button key={status} style={filterBtnStyle(status, filter === status)} onClick={() => setFilter(status)}>
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              <span style={{ fontSize: '11px', padding: '2px 6px', background: filter === status ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)', borderRadius: '10px' }}>
                {statusCounts[status]}
              </span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px', fontSize: '14px' }}>Loading cores...</div>
          ) : filteredCores.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px', fontSize: '14px' }}>No cores found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {rows.map((rowCores, rowIndex) => (
                <div key={rowIndex}>
                  <div style={rowLabelStyle}>{rowIndex * coresPerRow + 1}-{Math.min((rowIndex + 1) * coresPerRow, filteredCores.length)}</div>
                  <div style={cardsGridStyle}>
                    {rowCores.map(core => (
                      <div key={core.id} style={cardStyle(core.status)} onClick={() => handleEditClick(core)}>
                        {editingCore === core.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                            <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={{ width: '100%', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px' }}>
                              <option value="available">Available</option>
                              <option value="allocated">Allocated</option>
                              <option value="spliced">Spliced</option>
                              <option value="damaged">Damaged</option>
                              <option value="reserved">Reserved</option>
                            </select>
                            <input type="text" value={editForm.client_name} onChange={e => setEditForm({ ...editForm, client_name: e.target.value })} placeholder="Client" style={{ width: '100%', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', boxSizing: 'border-box' }} />
                            <input type="text" value={editForm.client_area} onChange={e => setEditForm({ ...editForm, client_area: e.target.value })} placeholder="Area" style={{ width: '100%', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '10px', boxSizing: 'border-box' }} />
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '4px' }}>
                              <button onClick={(e) => { e.stopPropagation(); handleSave(core.id); }} disabled={saving} style={{ width: '24px', height: '24px', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', background: '#22c55e', color: 'white', fontSize: '12px' }}>{saving ? '...' : '✓'}</button>
                              <button onClick={(e) => { e.stopPropagation(); handleCancel(); }} style={{ width: '24px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: '#fee2e2', color: '#ef4444', fontSize: '12px' }}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>{core.core_number}</div>
                            <div style={{ fontSize: '10px', fontWeight: 600, margin: '4px 0', color: getStatusColor(core.status) }}>{getStatusLabel(core.status)}</div>
                            <div style={{ fontSize: '11px', color: '#374151', fontWeight: 500, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{core.client_name || '-'}</div>
                            <div style={{ fontSize: '10px', color: '#6b7280', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{core.client_area || '-'}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoreAllocationModal;
