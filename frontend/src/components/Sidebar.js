import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Map, Building, Settings, Globe, LogOut, ChevronLeft, ChevronRight, User } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggleSidebar, onNavigate, currentView }) => {
  const { user, logout, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      label: 'Map',
      icon: Map,
      view: 'map'
    },
    {
      label: 'Infrastructure',
      icon: Building,
      view: 'infrastructure'
    },
  ];

  if (isAdmin) {
    menuItems.push({
      label: 'Admin Panel',
      icon: Settings,
      view: 'admin'
    });
  }

  const handleMenuClick = (item) => {
    const pathMap = {
      'map': '/dashboard',
      'infrastructure': '/dashboard?view=infrastructure',
      'admin': '/dashboard?view=admin'
    };
    onNavigate(pathMap[item.view]);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Globe className="brand-icon-svg" size={24} />
          <span className="brand-text">Infra Network</span>
        </div>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          <User size={20} />
        </div>
        <div className="user-details">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{user?.role}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems
            .filter(item => !item.adminOnly || isAdmin)
            .map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={index} className="nav-item">
                <button
                  className={`nav-link ${currentView === item.view ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item)}
                >
                  <Icon className="nav-icon-svg" size={20} />
                  <span className="nav-label">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
