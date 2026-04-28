import React, { useState, useEffect } from 'react';
import { userService, infrastructureTypeService } from '../services/services';
import { Settings, Users, Database, MemoryStick, GalleryThumbnails, Microchip, NotebookTabs, Notebook, Server, Router, Network, Flag, HardDrive, Waypoints, Circle, Container, MapPin, Blinds, KeyboardMusic } from 'lucide-react';
import UserManagement from './UserManagement';
import CableTypeManager from './CableTypeManager';
import './AdminPanel.css';

// Icon mapping function that matches type name to Lucide icon
const getTypeIcon = (typeName) => {
  const name = (typeName || '').toLowerCase();

  // Exact matches
  if (name === 'pop') return MapPin;
  if (name.includes('data center')) return Container;
  if (name === 'olt') return MemoryStick;
  if (name.includes('otb')) return GalleryThumbnails;
  if (name.includes('joint') || name.includes('box')) return Microchip;
  if (name === 'odc') return NotebookTabs;
  if (name === 'odp') return Notebook;
  if (name.includes('server') || name.includes('pve') || name.includes('storage') || name.includes('nas')) return Server;
  if (name.includes('router') || name.includes('mx') || name.includes('bgp') || name.includes('ccr')) return Router;
  if (name.includes('switch') || name.includes('nexus') || name.includes('ce') || name.includes('cn') || name.includes('crs')) return KeyboardMusic;
  if (name.includes('tiang') || name.includes('pole')) return Flag;
  if (name.includes('rack')) return Blinds;
  if (name.includes('kabel') || name.includes('cable')) return Waypoints;

  // Category-based fallback
  if (name.includes('olt')) return MemoryStick;
  if (name.includes('server')) return Server;
  if (name.includes('router')) return Router;
  if (name.includes('switch')) return KeyboardMusic;

  return Circle;
};

// Get color by type name
const getTypeColor = (typeName) => {
  const name = (typeName || '').toLowerCase();

  if (name === 'pop') return '#667eea';
  if (name.includes('otb')) return '#2196F3';
  if (name.includes('joint') || name.includes('box')) return '#FF9800';
  if (name === 'odc') return '#9C27B0';
  if (name === 'odp') return '#00BCD4';
  if (name.includes('server')) return '#5f27cd';
  if (name.includes('router')) return '#00d2d3';
  if (name.includes('switch')) return '#fd79a8';
  if (name.includes('olt')) return '#00cec9';
  if (name.includes('tiang')) return '#1dd1a1';
  if (name.includes('rack')) return '#673AB7';

  return '#95a5a6';
};

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await userService.getAll();
      setUsers(res.data);
    } catch (error) {
      console.error('Error loading users:', error);
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'types') {
      loadTypes();
    }
  }, [activeTab]);

  const handleDeleteType = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this type?')) return;

    try {
      await infrastructureTypeService.delete(typeId);
      alert('Type deleted successfully');
      loadTypes();
    } catch (error) {
      alert('Failed to delete type: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAddType = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const typeData = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      default_ports: parseInt(formData.get('default_ports')) || 0,
      port_type: formData.get('port_type'),
      default_u_height: parseInt(formData.get('default_u_height')) || 1,
      default_power_w: parseInt(formData.get('default_power_w')) || 0,
      icon_url: formData.get('icon_url') || '📟',
    };

    try {
      await infrastructureTypeService.create(typeData);
      alert('Type created successfully');
      e.target.reset();
      loadTypes();
    } catch (error) {
      alert('Failed to create type: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="header-content">
          <Settings size={28} className="header-icon" />
          <div>
            <h1>Admin Panel</h1>
            <p className="admin-subtitle">System Management</p>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} />
          User Management
        </button>
        <button
          className={`admin-tab ${activeTab === 'types' ? 'active' : ''}`}
          onClick={() => setActiveTab('types')}
        >
          <Database size={18} />
          Infrastructure Types
        </button>
        <button
          className={`admin-tab ${activeTab === 'cable-types' ? 'active' : ''}`}
          onClick={() => setActiveTab('cable-types')}
        >
          <Waypoints size={18} />
          Cable Types
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'users' && (
          <UserManagement users={users} onDataChange={loadData} />
        )}

        {activeTab === 'types' && (
          <div className="types-management">
            <div className="types-form-section">
              <h3>Add New Infrastructure Type</h3>
              <form onSubmit={handleAddType} className="types-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Type Name</label>
                    <input type="text" name="name" required placeholder="e.g., OLT ZTE C300" />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" required>
                      <option value="pop">POP</option>
                      <option value="data_center">Data Center</option>
                      <option value="rack">Rack</option>
                      <option value="otb">OTB</option>
                      <option value="olt">OLT</option>
                      <option value="router">Router</option>
                      <option value="switch">Switch</option>
                      <option value="server">Server</option>
                      <option value="odc">ODC</option>
                      <option value="odp">ODP</option>
                      <option value="joint_box">Joint Box</option>
                      <option value="tiang">Tiang</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Description</label>
                    <input type="text" name="description" placeholder="Description" />
                  </div>
                  <div className="form-group">
                    <label>Icon (emoji)</label>
                    <input type="text" name="icon_url" defaultValue="📟" placeholder="📟" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Default Ports</label>
                    <input type="number" name="default_ports" defaultValue="16" />
                  </div>
                  <div className="form-group">
                    <label>Port Type</label>
                    <select name="port_type">
                      <option value="fiber">Fiber</option>
                      <option value="copper">Copper</option>
                      <option value="mixed">Mixed</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>U-Height</label>
                    <input type="number" name="default_u_height" defaultValue="1" />
                  </div>
                  <div className="form-group">
                    <label>Default Power (W)</label>
                    <input type="number" name="default_power_w" defaultValue="150" />
                  </div>
                </div>

                <button type="submit" className="btn-primary">Add Type</button>
              </form>
            </div>

            <div className="types-list-section">
              <h3>Existing Types ({types.length})</h3>
              <div className="types-grid">
                {types.map(type => {
                  const IconComponent = getTypeIcon(type.name);
                  const iconColor = getTypeColor(type.name);
                  return (
                    <div key={type.id} className="type-card">
                      <div className="type-icon" style={{ color: iconColor }}>
                        <IconComponent size={28} />
                      </div>
                      <div className="type-info">
                        <h4>{type.name}</h4>
                        <p className="type-category">{type.category}</p>
                        <p className="type-desc">{type.description}</p>
                        <div className="type-details">
                          <span>Ports: {type.default_ports}</span>
                          <span>U: {type.default_u_height}</span>
                          <span>{type.default_power_w}W</span>
                        </div>
                      </div>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteType(type.id)}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cable-types' && (
          <CableTypeManager />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
