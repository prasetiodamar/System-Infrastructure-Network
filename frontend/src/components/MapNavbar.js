import React from 'react';
import {
  Map as MapIcon,
  Layers,
  Navigation,
  Settings,
  Info
} from 'lucide-react';
import './MapNavbar.css';

const MapNavbar = ({ activeSubView, onSubViewChange }) => {
  const subMenuItems = [
    { id: 'map', label: 'Map View', icon: MapIcon },
    { id: 'layers', label: 'Layers', icon: Layers },
    { id: 'routes', label: 'Routes', icon: Navigation },
    { id: 'info', label: 'Info', icon: Info },
  ];

  return (
    <div className="map-navbar">
      <div className="navbar-container">
        <div className="navbar-title">Network Map</div>
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

export default MapNavbar;
