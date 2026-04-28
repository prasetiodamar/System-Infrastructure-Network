import React, { useState, useEffect } from 'react';
import { cableService, coreService } from '../services/services';
import CoreEditModal from './CoreEditModal';
import './CableManager.css';

const CableManager = ({ cable, onClose }) => {
  const [cores, setCores] = useState([]);
  const [summary, setSummary] = useState({ total: 0, allocated: 0, available: 0, spliced: 0, damaged: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCore, setSelectedCore] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadCores();
    loadSummary();
  }, [cable]);

  const loadCores = async () => {
    try {
      setLoading(true);
      const response = await cableService.getCores(cable.id);
      setCores(response.data);
    } catch (error) {
      console.error('Error loading cores:', error);
      alert('Gagal memuat data core');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await cableService.getCoreSummary(cable.id);
      setSummary(response.data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleCoreClick = (core) => {
    setSelectedCore(core);
    setShowEditModal(true);
  };

  const handleCoreSave = () => {
    setShowEditModal(false);
    loadCores();
    loadSummary();
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

  const getStatusBg = (status) => {
    const colors = {
      available: '#f0fdf4',
      allocated: '#eff6ff',
      spliced: '#fffbeb',
      damaged: '#fef2f2',
      reserved: '#f5f3ff',
    };
    return colors[status] || '#f9fafb';
  };

  const getStatusBorder = (status) => {
    const colors = {
      available: '#22c55e',
      allocated: '#3b82f6',
      spliced: '#f59e0b',
      damaged: '#ef4444',
      reserved: '#8b5cf6',
    };
    return colors[status] || '#d1d5db';
  };

  // Fiber color mapping
  const fiberColorMap = {
    'Biru': '#0000FF',
    'Orange': '#FFA500',
    'Hijau': '#008000',
    'Coklat': '#A52A2A',
    'Abu': '#808080',
    'Putih': '#FFFFFF',
    'Merah': '#FF0000',
    'Hitam': '#000000',
    'Kuning': '#FFFF00',
    'Ungu': '#800080',
    'Pink': '#FFC0CB',
    'Tosca': '#00FFFF',
  };

  // Tube color mapping - each tube has a distinct color
  const tubeColorMap = {
    'Biru': '#2196F3',
    'Orange': '#FB8C00',
    'Hijau': '#43A047',
    'Coklat': '#6D4C41',
    'Abu': '#757575',
    'Putih': '#FAFAFA',
    'Merah': '#E53935',
    'Hitam': '#424242',
  };

  const getFiberColorCode = (colorName) => {
    return fiberColorMap[colorName] || '#999999';
  };

  const getTubeColorCode = (colorName) => {
    return tubeColorMap[colorName] || '#607D8B';
  };

  const getStatusLabel = (status) => {
    const labels = {
      available: 'AVL',
      allocated: 'ALL',
      spliced: 'SPL',
      damaged: 'DMG',
      reserved: 'RSV',
    };
    return labels[status] || status?.substring(0, 3).toUpperCase() || 'N/A';
  };

  const filteredCores = cores.filter(core => {
    if (filter === 'all') return true;
    return core.status === filter;
  });

  // Group cores by tube
  const coresByTube = filteredCores.reduce((acc, core) => {
    const tube = core.tube_number || 1;
    if (!acc[tube]) acc[tube] = [];
    acc[tube].push(core);
    return acc;
  }, {});

  // Get tube count from cable type or calculate from cores
  const tubeCount = Object.keys(coresByTube).length;

  if (loading) {
    return (
      <div className="cable-manager">
        <div className="loading">Loading core data...</div>
      </div>
    );
  }

  return (
    <div className="cable-manager">
      <div className="cable-manager-header">
        <div>
          <h2>Core Management - {cable.name}</h2>
          <p className="cable-manager-subtitle">
            {cable.cable_type?.name} | {cable.core_count} Cores | {cable.length}m
          </p>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="core-summary">
        <div className="summary-card">
          <div className="summary-label">Total Core</div>
          <div className="summary-value">{summary.total}</div>
        </div>
        <div className="summary-card available">
          <div className="summary-label">Available</div>
          <div className="summary-value">{summary.available}</div>
        </div>
        <div className="summary-card allocated">
          <div className="summary-label">Allocated</div>
          <div className="summary-value">{summary.allocated}</div>
        </div>
        <div className="summary-card spliced">
          <div className="summary-label">Spliced</div>
          <div className="summary-value">{summary.spliced}</div>
        </div>
        <div className="summary-card damaged">
          <div className="summary-label">Damaged</div>
          <div className="summary-value">{summary.damaged}</div>
        </div>
      </div>

      <div className="core-filters">
        {['all', 'available', 'allocated', 'spliced', 'damaged', 'reserved'].map(status => (
          <button
            key={status}
            className={`filter-btn ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
            style={{
              background: filter === status
                ? (status === 'all' ? '#1f2937' : getStatusColor(status))
                : '#f3f4f6',
              color: filter === status ? 'white' : '#6b7280',
            }}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            <span style={{
              marginLeft: '6px',
              fontSize: '11px',
              padding: '2px 6px',
              background: filter === status ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
              borderRadius: '10px'
            }}>
              {status === 'all' ? cores.length : status === 'available' ? summary.available : status === 'allocated' ? summary.allocated : status === 'spliced' ? summary.spliced : status === 'damaged' ? summary.damaged : cores.filter(c => c.status === status).length}
            </span>
          </button>
        ))}
      </div>

      <div className="cores-by-tube">
        {Object.entries(coresByTube)
          .sort(([a], [b]) => a - b)
          .map(([tube, tubeCores]) => {
            const tubeColorName = tubeCores[0]?.tube_color || 'Biru';
            const tubeColorCode = getTubeColorCode(tubeColorName);
            return (
            <div key={tube} className="tube-group" style={{ borderLeft: `4px solid ${tubeColorCode}` }}>
              <div className="tube-header">
                <span className="tube-badge" style={{ background: tubeColorCode }}>
                  Tube {tube}
                </span>
                <span className="tube-info">{tubeCores.length} cores • {tubeColorName}</span>
              </div>
              <div className="cores-grid">
                {tubeCores
                  .sort((a, b) => a.core_number - b.core_number)
                  .map(core => (
                    <div
                      key={core.id}
                      className="core-card"
                      onClick={() => handleCoreClick(core)}
                      style={{
                        backgroundColor: getStatusBg(core.status),
                        borderLeft: `4px solid ${tubeColorCode}`,
                        borderColor: getStatusBorder(core.status),
                      }}
                    >
                      {/* Fiber Color indicator */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '6px',
                      }}>
                        <span style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: getFiberColorCode(core.fiber_color),
                          border: '1px solid rgba(0,0,0,0.2)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }} />
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#555' }}>
                          {core.fiber_color || '-'}
                        </span>
                      </div>
                      <div className="core-number" style={{ fontSize: '18px', fontWeight: 700 }}>
                        {core.core_number}
                      </div>
                      <div className="core-status" style={{ color: getStatusColor(core.status), fontSize: '10px' }}>
                        {getStatusLabel(core.status)}
                      </div>
                      <div className="core-client" style={{ fontSize: '11px' }}>{core.client_name || '-'}</div>
                    </div>
                  ))}
              </div>
            </div>
            );
          })}
      </div>

      {showEditModal && selectedCore && (
        <CoreEditModal
          core={selectedCore}
          onClose={() => setShowEditModal(false)}
          onSave={handleCoreSave}
        />
      )}
    </div>
  );
};

export default CableManager;
