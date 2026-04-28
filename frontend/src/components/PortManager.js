import React, { useState, useEffect } from 'react';
import { portService } from '../services/services';
import PortEditModal from './PortEditModal';
import OdcManager from './OdcManager';
import OdpManager from './OdpManager';
import './PortManager.css';

const PortManager = ({ infrastructure, onClose }) => {
  const [ports, setPorts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, allocated: 0, available: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPort, setSelectedPort] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [isOdc, setIsOdc] = useState(false);
  const [isOdp, setIsOdp] = useState(false);

  useEffect(() => {
    checkInfrastructureType();
    loadPorts();
    loadSummary();
  }, [infrastructure]);

  const checkInfrastructureType = () => {
    const typeName = infrastructure.type?.name?.toLowerCase() || '';
    const infraName = infrastructure.name?.toLowerCase() || '';

    if (typeName.includes('odc') || infraName.includes('odc')) {
      setIsOdc(true);
    } else if (typeName.includes('odp') || infraName.includes('odp')) {
      setIsOdp(true);
    }
  };

  const loadPorts = async () => {
    try {
      setLoading(true);
      const response = await portService.getByInfrastructure(infrastructure.id);
      setPorts(response.data);
    } catch (error) {
      console.error('Error loading ports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await portService.getSummary(infrastructure.id);
      setSummary(response.data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handlePortClick = (port) => {
    setSelectedPort(port);
    setShowEditModal(true);
  };

  const handlePortSave = () => {
    setShowEditModal(false);
    loadPorts();
    loadSummary();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#22c55e';
      case 'allocated': return '#3b82f6';
      case 'maintenance': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  const filteredPorts = ports.filter(port => {
    if (filter === 'all') return true;
    return port.status === filter;
  });

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Use OdcManager for ODC infrastructure
  if (isOdc) {
    return (
      <OdcManager
        infrastructure={infrastructure}
        onClose={onClose}
      />
    );
  }

  // Use OdpManager for ODP infrastructure
  if (isOdp) {
    return (
      <OdpManager
        infrastructure={infrastructure}
        onClose={onClose}
      />
    );
  }

  // Calculate number of rows needed (12 ports per row)
  const portRows = [];
  const portsPerRow = 12;
  for (let i = 0; i < filteredPorts.length; i += portsPerRow) {
    portRows.push(filteredPorts.slice(i, i + portsPerRow));
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {infrastructure.name}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
            {infrastructure.type?.name || 'Infrastructure'} - {ports.length} Ports
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280', padding: '0', lineHeight: 1 }}
        >×</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>{summary.total}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
        </div>
        <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#16a34a' }}>{summary.available}</div>
          <div style={{ fontSize: '12px', color: '#16a34a' }}>Available</div>
        </div>
        <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#2563eb' }}>{summary.allocated}</div>
          <div style={{ fontSize: '12px', color: '#2563eb' }}>Allocated</div>
        </div>
        <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#d97706' }}>{summary.maintenance}</div>
          <div style={{ fontSize: '12px', color: '#d97706' }}>Maintenance</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'available', 'allocated', 'maintenance'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              background: filter === status
                ? (status === 'all' ? '#1f2937' : getStatusColor(status))
                : '#f3f4f6',
              color: filter === status ? 'white' : '#6b7280',
              textTransform: 'capitalize'
            }}
          >
            {status === 'all' ? 'All' : status} ({status === 'all' ? ports.length : status === 'available' ? summary.available : status === 'allocated' ? summary.allocated : summary.maintenance})
          </button>
        ))}
      </div>

      {/* Ports Grid by Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {portRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            No ports found
          </div>
        ) : (
          portRows.map((row, rowIndex) => {
            const startPort = rowIndex * portsPerRow + 1;
            const endPort = startPort + row.length - 1;
            return (
              <div key={rowIndex}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                  {startPort}-{endPort}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(row.length, 12)}, 1fr)`, gap: '6px' }}>
                  {row.map(port => (
                    <div
                      key={port.id}
                      onClick={() => handlePortClick(port)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '6px',
                        background: port.status === 'available' ? '#f0fdf4' : port.status === 'allocated' ? '#eff6ff' : '#fffbeb',
                        border: '2px solid',
                        borderColor: getStatusColor(port.status),
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'transform 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                        {port.port_number}
                      </div>
                      <div style={{ fontSize: '9px', color: getStatusColor(port.status), fontWeight: '500', textTransform: 'capitalize' }}>
                        {port.status === 'available' ? 'AVL' : port.status === 'allocated' ? 'ALL' : 'MNT'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showEditModal && selectedPort && (
        <PortEditModal
          port={selectedPort}
          infrastructure={infrastructure}
          onClose={() => setShowEditModal(false)}
          onSave={handlePortSave}
        />
      )}
    </div>
  );
};

export default PortManager;
