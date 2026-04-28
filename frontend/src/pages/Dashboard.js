import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AdminPanel from '../components/AdminPanel';
import Sidebar from '../components/Sidebar';
import InfrastructureNavbar from '../components/InfrastructureNavbar';
import MapNavbar from '../components/MapNavbar';
import InfrastructureDashboard from '../components/InfrastructureDashboard';
import InfrastructureView from '../components/InfrastructureView';
import OTBView from '../components/OTBView';
import CablesView from '../components/CablesView';
import SiteManager from '../components/SiteManager';
import RackManager from '../components/RackManager';
import LibreNMSManager from '../components/LibreNMSManager';
import ClientManager from '../components/ClientManager';
import MapComponent from '../components/MapComponent';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [targetLocation, setTargetLocation] = useState(null);

  // Get current view and subview from URL params
  const currentView = searchParams.get('view') || 'map';
  const currentSubView = searchParams.get('subview') || 'dashboard';
  const mapSubView = searchParams.get('mapview') || 'map';

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavigate = (path) => {
    // Parse view from path
    if (path.includes('view=admin')) {
      setSearchParams({ view: 'admin' });
    } else if (path.includes('view=infrastructure')) {
      setSearchParams({ view: 'infrastructure', subview: 'dashboard' });
    } else {
      setSearchParams({ view: 'map' });
    }
  };

  const handleSubViewChange = (subView) => {
    setSearchParams({ view: 'infrastructure', subview: subView });
  };

  const handleMapSubViewChange = (mapSubView) => {
    setSearchParams({ view: 'map', mapview: mapSubView });
  };

  const renderContent = () => {
    // Map view
    if (currentView === 'map') {
      return (
        <>
          <MapNavbar
            activeSubView={mapSubView}
            onSubViewChange={handleMapSubViewChange}
          />
          <MapComponent targetLocation={targetLocation} />
        </>
      );
    }

    // Admin view
    if (currentView === 'admin') {
      return isAdmin ? <AdminPanel /> : <div className="access-denied">Access Denied</div>;
    }

    // Infrastructure view (includes Racks and Sites as subviews)
    return (
      <>
        <InfrastructureNavbar
          activeSubView={currentSubView}
          onSubViewChange={handleSubViewChange}
        />
        <div className="infrastructure-content">
          {currentSubView === 'dashboard' && <InfrastructureDashboard />}
          {currentSubView === 'librenms' && <LibreNMSManager />}
          {currentSubView === 'otb' && <OTBView />}
          {currentSubView === 'joint-box' && <InfrastructureView typeName="joint-box" />}
          {currentSubView === 'odc' && <InfrastructureView typeName="odc" />}
          {currentSubView === 'odp' && <InfrastructureView typeName="odp" />}
          {currentSubView === 'cables' && <CablesView />}
          {currentSubView === 'tiang' && <InfrastructureView typeName="tiang" />}
          {currentSubView === 'racks' && <RackManager />}
          {currentSubView === 'clients' && <ClientManager />}
          {currentSubView === 'sites' && (isAdmin ? <SiteManager /> : <div className="access-denied">Access Denied</div>)}
        </div>
      </>
    );
  };

  return (
    <div className={`dashboard ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        onNavigate={handleNavigate}
        currentView={currentView}
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
