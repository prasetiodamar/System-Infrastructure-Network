import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  infrastructureService,
  rackService,
  siteService,
  cableService,
  spliceService,
  connectionService
} from '../services/services';
import {
  GalleryThumbnails,
  Microchip,
  NotebookTabs,
  Notebook,
  Server,
  Router,
  Network,
  Flag,
  BarChart3,
  HardDrive,
  MapPin,
  MemoryStick,
  Container,
  Blinds,
  KeyboardMusic,
  Waypoints,
  Zap,
  Plus,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Activity,
  Clock,
  TrendingUp,
  Layers,
  Cpu,
  Box,
  Link,
  Gauge,
  Building2,
  TreePine,
  Workflow
} from 'lucide-react';
import './InfrastructureDashboard.css';

const InfrastructureDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sites: { count: 0, color: '#E91E63', icon: MapPin, name: 'Sites' },
    racks: { count: 0, color: '#673AB7', icon: Blinds, name: 'Racks' },
    dataCenter: { count: 0, color: '#9C27B0', icon: Container, name: 'Data Center' },
    pop: { count: 0, color: '#4CAF50', icon: MapPin, name: 'POP' },
    olt: { count: 0, color: '#00BCD4', icon: MemoryStick, name: 'OLT' },
    otb: { count: 0, color: '#2196F3', icon: GalleryThumbnails, name: 'OTB' },
    jointBox: { count: 0, color: '#FF9800', icon: Microchip, name: 'Joint Box' },
    odc: { count: 0, color: '#9C27B0', icon: NotebookTabs, name: 'ODC' },
    odp: { count: 0, color: '#00BCD4', icon: Notebook, name: 'ODP' },
    server: { count: 0, color: '#3F51B5', icon: Server, name: 'Server' },
    router: { count: 0, color: '#009688', icon: Router, name: 'Router' },
    switch: { count: 0, color: '#FF5722', icon: KeyboardMusic, name: 'Switch' },
    tiang: { count: 0, color: '#795548', icon: Flag, name: 'Tiang' },
  });

  const [cables, setCables] = useState([]);
  const [splices, setSplices] = useState([]);
  const [connections, setConnections] = useState([]);
  const [totalCores, setTotalCores] = useState(0);
  const [recentItems, setRecentItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [siteStats, setSiteStats] = useState([]);
  const [equipmentDist, setEquipmentDist] = useState([]);

  const quickAccessItems = [
    { id: 'rack', title: 'Rack Management', icon: Blinds, color: '#673AB7', route: '/dashboard?view=infrastructure&subview=racks', description: 'Manage racks & equipment' },
    { id: 'olt', title: 'OLT/OTB Management', icon: MemoryStick, color: '#00BCD4', route: '/dashboard?view=infrastructure&subview=otb', description: 'Optical Line Terminals' },
    { id: 'cable', title: 'Cable Management', icon: Waypoints, color: '#E91E63', route: '/dashboard?view=infrastructure&subview=cables', description: 'Fiber optic cables' },
    { id: 'splice', title: 'Splice Management', icon: Workflow, color: '#FF9800', route: '/dashboard?view=infrastructure&subview=cables', description: 'Splice points & cores' },
    { id: 'infra', title: 'Infrastructure', icon: Layers, color: '#4CAF50', route: '/dashboard?view=infrastructure&subview=dashboard', description: 'All network nodes' },
    { id: 'site', title: 'Site Management', icon: Building2, color: '#9C27B0', route: '/dashboard?view=infrastructure&subview=sites', description: 'Sites & locations' },
    { id: 'connection', title: 'Connections', icon: Link, color: '#3F51B5', route: '/dashboard?view=map', description: 'Network connections' },
    { id: 'topology', title: 'Network Topology', icon: Network, color: '#009688', route: '/dashboard?view=map', description: 'Visual topology' },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      console.log('Loading dashboard data...');

      // Fetch all data with error handling
      let infraRes, racksRes, sitesRes, cablesRes, splicesRes, connectionsRes;

      try {
        infraRes = await infrastructureService.getAll();
      } catch (e) { console.error('Error loading infrastructures:', e); infraRes = { data: [] }; }

      try {
        racksRes = await rackService.getAll();
      } catch (e) { console.error('Error loading racks:', e); racksRes = { data: [] }; }

      try {
        sitesRes = await siteService.getAll();
      } catch (e) { console.error('Error loading sites:', e); sitesRes = { data: [] }; }

      try {
        cablesRes = await cableService.getAll();
      } catch (e) { console.error('Error loading cables:', e); cablesRes = { data: [] }; }

      try {
        splicesRes = await spliceService.getAll();
      } catch (e) { console.error('Error loading splices:', e); splicesRes = { data: [] }; }

      try {
        connectionsRes = await connectionService.getAll();
      } catch (e) { console.error('Error loading connections:', e); connectionsRes = { data: [] }; }

      console.log('API Responses:', {
        infrastructures: infraRes.data?.length,
        racks: racksRes.data?.length,
        sites: sitesRes.data?.length,
        cables: cablesRes.data?.length,
        splices: splicesRes.data?.length,
        connections: connectionsRes.data?.length
      });

      const infrastructures = infraRes.data || [];
      const sites = sitesRes.data || [];
      const cablesData = cablesRes.data || [];
      const splicesData = splicesRes.data || [];
      const connectionsData = connectionsRes.data || [];

      // Calculate total cores from cables (each cable has core_count)
      const totalCores = cablesData.reduce((sum, cable) => sum + (cable.core_count || 0), 0);

      // Update counts - include sites and racks directly
      const newStats = {
        sites: { count: sites.length, color: '#E91E63', icon: MapPin, name: 'Sites' },
        racks: { count: racksRes.data?.length || 0, color: '#673AB7', icon: Blinds, name: 'Racks' },
        dataCenter: { count: 0, color: '#9C27B0', icon: Container, name: 'Data Center' },
        pop: { count: 0, color: '#4CAF50', icon: MapPin, name: 'POP' },
        olt: { count: 0, color: '#00BCD4', icon: MemoryStick, name: 'OLT' },
        otb: { count: 0, color: '#2196F3', icon: GalleryThumbnails, name: 'OTB' },
        jointBox: { count: 0, color: '#FF9800', icon: Microchip, name: 'Joint Box' },
        odc: { count: 0, color: '#9C27B0', icon: NotebookTabs, name: 'ODC' },
        odp: { count: 0, color: '#00BCD4', icon: Notebook, name: 'ODP' },
        server: { count: 0, color: '#3F51B5', icon: Server, name: 'Server' },
        router: { count: 0, color: '#009688', icon: Router, name: 'Router' },
        switch: { count: 0, color: '#FF5722', icon: KeyboardMusic, name: 'Switch' },
        tiang: { count: 0, color: '#795548', icon: Flag, name: 'Tiang' },
      };

      // Count by type
      const typeCounts = {};
      console.log('Processing infrastructures:', infrastructures.length);

      // Log first infrastructure to see structure
      if (infrastructures.length > 0) {
        console.log('Sample infrastructure:', infrastructures[0]);
        console.log('Infrastructure type:', infrastructures[0].type);
      }

      infrastructures.forEach((infra) => {
        const typeName = infra.type?.name?.toLowerCase() || '';
        console.log('Found type:', typeName);
        typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;

        if (typeName === 'pop') newStats.pop.count++;
        else if (typeName.includes('data center')) newStats.dataCenter.count++;
        else if (typeName === 'olt') newStats.olt.count++;
        else if (typeName.includes('otb')) newStats.otb.count++;
        else if (typeName.includes('joint') || typeName.includes('box')) newStats.jointBox.count++;
        else if (typeName === 'odc') newStats.odc.count++;
        else if (typeName === 'odp') newStats.odp.count++;
        else if (typeName === 'server') newStats.server.count++;
        else if (typeName === 'router') newStats.router.count++;
        else if (typeName === 'switch') newStats.switch.count++;
        else if (typeName === 'tiang') newStats.tiang.count++;
      });

      console.log('Type counts:', typeCounts);
      console.log('Stats after counting:', newStats);

      setStats(newStats);
      setCables(cablesData);
      setSplices(splicesData);
      setConnections(connectionsData);
      setTotalCores(totalCores); // Total cores calculated from cables

      // Recent items - combine recent infrastructure, cables, splices
      const recentInfra = [...infrastructures]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 5)
        .map((item) => ({
          type: 'infrastructure',
          name: item.name,
          subType: item.type?.name,
          date: item.created_at,
          icon: getTypeIcon(item.type?.name)
        }));

      const recentCables = [...cablesData]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 3)
        .map((item) => ({
          type: 'cable',
          name: item.name,
          subType: item.cable_type?.name,
          date: item.created_at,
          icon: Waypoints
        }));

      setRecentItems([...recentInfra, ...recentCables].sort((a, b) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      ).slice(0, 6));

      // Alerts - check for issues
      const newAlerts = [];

      // Double splices check
      const spliceGroups = {};
      splicesData.forEach((splice) => {
        const key = `${splice.from_core_id}-${splice.to_core_id}`;
        spliceGroups[key] = (spliceGroups[key] || 0) + 1;
      });
      Object.entries(spliceGroups).forEach(([key, count]) => {
        if (count > 1) {
          newAlerts.push({
            id: newAlerts.length + 1,
            type: 'danger',
            title: 'Duplicate Splices Detected',
            message: `${count} splices found on the same core connection`,
            icon: AlertTriangle
          });
        }
      });

      // Inactive cables
      const inactiveCables = cablesData.filter((c) => c.status === 'inactive' || c.status === 'damaged');
      if (inactiveCables.length > 0) {
        newAlerts.push({
          id: newAlerts.length + 1,
          type: 'warning',
          title: 'Inactive/Damaged Cables',
          message: `${inactiveCables.length} cables are marked as inactive or damaged`,
          icon: AlertTriangle
        });
      }

      // No connections
      if (connectionsData.length === 0 && cablesData.length > 0) {
        newAlerts.push({
          id: newAlerts.length + 1,
          type: 'info',
          title: 'No Connections',
          message: 'No connections defined yet. Start by creating connections between infrastructure.',
          icon: AlertCircle
        });
      }

      setAlerts(newAlerts);

      // Site stats - top 5 sites with most infrastructure
      const siteInfraCounts = {};
      sites.forEach((site) => {
        siteInfraCounts[site.name] = 0;
      });
      infrastructures.forEach((infra) => {
        if (infra.site?.name) {
          siteInfraCounts[infra.site.name] = (siteInfraCounts[infra.site.name] || 0) + 1;
        }
      });
      const topSites = Object.entries(siteInfraCounts)
        .map(([site, count]) => ({ site, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setSiteStats(topSites);

      // Equipment distribution
      const distColors = ['#667eea', '#f97316', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];
      const equipmentTypes = [
        { type: 'OLT', count: newStats.olt.count },
        { type: 'OTB', count: newStats.otb.count },
        { type: 'Joint Box', count: newStats.jointBox.count },
        { type: 'ODC', count: newStats.odc.count },
        { type: 'ODP', count: newStats.odp.count },
        { type: 'POP', count: newStats.pop.count },
        { type: 'Server', count: newStats.server.count },
        { type: 'Router', count: newStats.router.count },
      ].filter(e => e.count > 0);

      setEquipmentDist(equipmentTypes.map((e, i) => ({
        type: e.type,
        count: e.count,
        color: distColors[i % distColors.length]
      })));

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (typeName) => {
    const name = typeName?.toLowerCase() || '';
    if (name.includes('olt')) return MemoryStick;
    if (name.includes('otb')) return GalleryThumbnails;
    if (name.includes('joint') || name.includes('box')) return Microchip;
    if (name.includes('odc')) return NotebookTabs;
    if (name.includes('odp')) return Notebook;
    if (name === 'pop') return MapPin;
    if (name === 'server') return Server;
    if (name === 'router') return Router;
    if (name === 'switch') return KeyboardMusic;
    if (name === 'tiang') return Flag;
    if (name.includes('data center')) return Container;
    return Layers;
  };

  const navigateTo = (route) => {
    navigate(route);
  };

  const getTotalInfra = () => {
    return Object.values(stats).reduce((sum, stat) => sum + stat.count, 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const statEntries = Object.entries(stats);

  return (
    <div className="infrastructure-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <BarChart3 className="header-icon" size={32} />
        <div style={{ flex: 1 }}>
          <h1>Infrastructure Dashboard</h1>
          <p className="dashboard-subtitle">Overview of all network infrastructure</p>
        </div>
        <button
          className="refresh-btn"
          onClick={() => loadDashboardData()}
          disabled={loading}
          title="Refresh Data"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </button>
      </div>

      {/* 1. Quick Access Cards */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2><Box size={20} /> Quick Access</h2>
        </div>
        <div className="quick-access-grid">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="quick-access-card"
                style={{ '--card-color': item.color }}
                onClick={() => navigateTo(item.route)}
              >
                <div className="qa-icon">
                  <Icon size={28} />
                </div>
                <div className="qa-content">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <ArrowRight className="qa-arrow" size={18} />
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Summary Stats - Row 1 */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2><Gauge size={20} /> Summary Statistics</h2>
        </div>
        <div className="stats-grid">
          {statEntries.slice(0, 8).map(([key, stat]) => {
            const Icon = stat.icon;
            return (
              <div
                key={key}
                className="stat-card"
                style={{
                  '--stat-color': stat.color,
                  borderTop: `4px solid ${stat.color}`,
                }}
              >
                <div className="stat-icon" style={{ backgroundColor: stat.color }}>
                  <Icon size={24} color="white" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {stat.count}
                  </div>
                  <div className="stat-label">{stat.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Summary Stats - Row 2 + 4. Quick Actions */}
      <div className="two-column-section">
        <section className="dashboard-section">
          <div className="section-header">
            <h2><TrendingUp size={20} /> Network Overview</h2>
          </div>
          <div className="overview-stats">
            <div className="overview-card">
              <div className="overview-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                <Waypoints size={24} color="white" />
              </div>
              <div className="overview-info">
                <span className="overview-value">{cables.length}</span>
                <span className="overview-label">Total Cables</span>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon" style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>
                <Workflow size={24} color="white" />
              </div>
              <div className="overview-info">
                <span className="overview-value">{splices.length}</span>
                <span className="overview-label">Total Splices</span>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #4ade80)' }}>
                <Link size={24} color="white" />
              </div>
              <div className="overview-info">
                <span className="overview-value">{connections.length}</span>
                <span className="overview-label">Connections</span>
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #f472b6)' }}>
                <Cpu size={24} color="white" />
              </div>
              <div className="overview-info">
                <span className="overview-value">{totalCores}</span>
                <span className="overview-label">Fiber Cores</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Quick Actions */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2><Zap size={20} /> Quick Actions</h2>
          </div>
          <div className="quick-actions-grid">
            <button className="quick-action-btn" onClick={() => navigateTo('/dashboard?view=infrastructure&subview=cables')}>
              <Plus size={18} />
              <span>Add Cable</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigateTo('/dashboard?view=infrastructure&subview=cables')}>
              <Plus size={18} />
              <span>Add Splice</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigateTo('/dashboard?view=infrastructure&subview=joint-box')}>
              <Plus size={18} />
              <span>Add Infrastructure</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigateTo('/dashboard?view=map')}>
              <Plus size={18} />
              <span>Add Connection</span>
            </button>
          </div>
        </section>
      </div>

      {/* 5. Alerts/Warnings */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2><AlertTriangle size={20} /> Alerts & Warnings</h2>
        </div>
        <div className="alerts-container">
          {alerts.length === 0 ? (
            <div className="no-alerts">
              <Activity size={24} />
              <p>No alerts or warnings</p>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                    <div className="alert-icon">
                      <Icon size={18} />
                    </div>
                    <div className="alert-content">
                      <h4>{alert.title}</h4>
                      <p>{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 6. Recent Activity + 7. Equipment Distribution */}
      <div className="two-column-section">
        <section className="dashboard-section">
          <div className="section-header">
            <h2><Clock size={20} /> Recent Activity</h2>
          </div>
          <div className="recent-activity-list">
            {recentItems.length === 0 ? (
              <p className="no-data">No recent activity</p>
            ) : (
              recentItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      <Icon size={16} />
                    </div>
                    <div className="activity-content">
                      <span className="activity-name">{item.name}</span>
                      <span className="activity-type">{item.subType}</span>
                    </div>
                    <span className="activity-date">{formatDate(item.date)}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <h2><PieChart size={20} /> Equipment Distribution</h2>
          </div>
          <div className="equipment-dist-container">
            {equipmentDist.length === 0 ? (
              <p className="no-data">No equipment data</p>
            ) : (
              <>
                <div className="distribution-chart">
                  {equipmentDist.map((item, index) => {
                    const total = equipmentDist.reduce((sum, e) => sum + e.count, 0);
                    const percentage = total > 0 ? (item.count / total * 100).toFixed(1) : '0';
                    return (
                      <div key={index} className="dist-bar-container">
                        <div className="dist-label">
                          <span className="dist-name">{item.type}</span>
                          <span className="dist-count">{item.count}</span>
                        </div>
                        <div className="dist-bar-bg">
                          <div
                            className="dist-bar-fill"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                        <span className="dist-percentage">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="distribution-legend">
                  {equipmentDist.map((item, index) => (
                    <div key={index} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: item.color }} />
                      <span className="legend-name">{item.type}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* 8. Network Topology Mini View + Site Overview */}
      <div className="two-column-section">
        {/* 8. Network Topology Mini View */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2><Network size={20} /> Network Topology</h2>
          </div>
          <div className="topology-mini-view">
            <div className="topology-canvas">
            {/* Connection Lines SVG */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Lines from center to level 1 */}
              <path className="topo-connection" d="M50 50 L30 20" />
              <path className="topo-connection" d="M50 50 L70 20" />
              <path className="topo-connection" d="M50 50 L30 80" />
              <path className="topo-connection" d="M50 50 L70 80" />
              {/* Lines from level 1 to level 2 */}
              <path className="topo-connection" d="M30 20 L15 10" />
              <path className="topo-connection" d="M30 20 L85 10" />
              <path className="topo-connection" d="M30 80 L15 90" />
              <path className="topo-connection" d="M30 80 L85 90" />
            </svg>

              {/* Central node - Sites */}
              <div className="topo-node topo-central" style={{ top: '50%', left: '50%' }}>
                <div className="topo-icon" style={{ backgroundColor: '#E91E63' }}>
                  <Building2 size={16} color="white" />
                </div>
                <span className="topo-label">Sites</span>
                <span className="topo-count">{stats.sites.count}</span>
              </div>

              {/* Level 1 - Major Infrastructure */}
              <div className="topo-node topo-level1" style={{ top: '20%', left: '30%' }}>
                <div className="topo-icon" style={{ backgroundColor: '#673AB7' }}>
                  <Blinds size={14} color="white" />
                </div>
                <span className="topo-label">Racks</span>
                <span className="topo-count">{stats.racks.count}</span>
              </div>

              <div className="topo-node topo-level1" style={{ top: '20%', left: '70%' }}>
                <div className="topo-icon" style={{ backgroundColor: '#00BCD4' }}>
                  <MemoryStick size={14} color="white" />
                </div>
                <span className="topo-label">OLT</span>
                <span className="topo-count">{stats.olt.count}</span>
              </div>

              <div className="topo-node topo-level1" style={{ top: '80%', left: '30%' }}>
                <div className="topo-icon" style={{ backgroundColor: '#4CAF50' }}>
                  <MapPin size={14} color="white" />
                </div>
                <span className="topo-label">POP</span>
                <span className="topo-count">{stats.pop.count}</span>
              </div>

              <div className="topo-node topo-level1" style={{ top: '80%', left: '70%' }}>
                <div className="topo-icon" style={{ backgroundColor: '#2196F3' }}>
                  <GalleryThumbnails size={14} color="white" />
                </div>
                <span className="topo-label">OTB</span>
                <span className="topo-count">{stats.otb.count}</span>
              </div>

              {/* Level 2 - End Points */}
              <div className="topo-node topo-level2" style={{ top: '10%', left: '15%' }}>
                <div className="topo-icon" style={{ backgroundColor: '#FF9800' }}>
                  <Microchip size={12} color="white" />
                </div>
                <span className="topo-count">{stats.jointBox.count}</span>
              </div>

              <div className="topo-node topo-level2" style={{ top: '10%', left: '85%' }}>
                <div className="topo-icon" style={{ backgroundColor: '#9C27B0' }}>
                  <NotebookTabs size={12} color="white" />
                </div>
                <span className="topo-count">{stats.odc.count}</span>
              </div>

              <div className="topo-node topo-level2" style={{ top: '90%', left: '15%' }}>
                <div className="topo-icon" style={{ backgroundColor: '#795548' }}>
                  <Flag size={12} color="white" />
                </div>
                <span className="topo-count">{stats.tiang.count}</span>
              </div>

              <div className="topo-node topo-level2" style={{ top: '90%', left: '85%' }}>
                <div className="topo-icon" style={{ backgroundColor: '#3F51B5' }}>
                  <Server size={12} color="white" />
                </div>
                <span className="topo-count">{stats.server.count}</span>
              </div>

              {/* Connection lines would be drawn with SVG in a full implementation */}
            </div>
            <div className="topology-legend">
              <div className="topo-legend-item">
                <span className="topo-dot" style={{ backgroundColor: '#E91E63' }} />
                <span>Core (Sites)</span>
              </div>
              <div className="topo-legend-item">
                <span className="topo-dot" style={{ backgroundColor: '#673AB7' }} />
                <span>Level 1 (Racks/OLT)</span>
              </div>
              <div className="topo-legend-item">
                <span className="topo-dot" style={{ backgroundColor: '#FF9800' }} />
                <span>Edge (JB/ODC)</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Site Overview */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2><TreePine size={20} /> Site Overview</h2>
          </div>
          <div className="site-overview-list">
            {siteStats.length === 0 ? (
              <p className="no-data">No site data available</p>
            ) : (
              siteStats.map((site, index) => {
                const maxCount = Math.max(...siteStats.map(s => s.count));
                const percentage = maxCount > 0 ? (site.count / maxCount * 100) : 0;
                return (
                  <div key={index} className="site-overview-item">
                    <div className="site-rank">#{index + 1}</div>
                    <div className="site-info">
                      <span className="site-name">{site.site}</span>
                      <div className="site-bar-bg">
                        <div
                          className="site-bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="site-count">{site.count}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Total Summary */}
      <section className="dashboard-section total-summary">
        <div className="total-card">
          <div className="total-icon">
            <HardDrive size={32} color="white" />
          </div>
          <div className="total-content">
            <span className="total-label">Total Infrastructure</span>
            <span className="total-value">{getTotalInfra()}</span>
          </div>
          <div className="total-breakdown">
            <span>{stats.sites.count} Sites</span>
            <span>{cables.length} Cables</span>
            <span>{splices.length} Splices</span>
          </div>
        </div>
      </section>
    </div>
  );
};

// PieChart icon component
const PieChart = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

export default InfrastructureDashboard;
