import React from 'react';
import {
  LayoutDashboard,
  GalleryThumbnails,
  Microchip,
  NotebookTabs,
  Notebook,
  Waypoints,
  Network,
  Flag,
  MapPin,
  Cpu,
  Blinds,
  Activity,
  Users
} from 'lucide-react';
import './InfrastructureNavbar.css';

const InfrastructureNavbar = ({ activeSubView, onSubViewChange }) => {
  const subMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'librenms', label: 'Perangkat NMS', icon: Activity },
    { id: 'sites', label: 'Site', icon: MapPin },
    { id: 'racks', label: 'Rak', icon: Blinds },
    { id: 'otb', label: 'OTB', icon: GalleryThumbnails },
    { id: 'cables', label: 'Kabel', icon: Waypoints },
    { id: 'joint-box', label: 'Joint Box', icon: Microchip },
    { id: 'odc', label: 'ODC', icon: NotebookTabs },
    { id: 'odp', label: 'ODP', icon: Notebook },
    { id: 'tiang', label: 'Tiang', icon: Flag },
    { id: 'clients', label: 'Pelanggan', icon: Users },
  ];

  return (
    <div className="infrastructure-navbar">
      <div className="navbar-container">
        <div className="navbar-title">Infrastructure Management</div>
        <nav className="navbar-nav">
          <ul className="navbar-list">
            {subMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="navbar-item">
                  <button
                    className={`navbar-link ${activeSubView === item.id ? 'active' : ''}`}
                    onClick={() => onSubViewChange(item.id)}
                    title={item.label}
                  >
                    <Icon className="navbar-icon-svg" size={20} />
                    <span className="navbar-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default InfrastructureNavbar;
