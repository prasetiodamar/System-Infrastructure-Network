import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FaSearch } from 'react-icons/fa';
import { infrastructureService, cableService, siteService, clientService } from '../services/services';
import { getColorByType } from '../utils/iconMapping';
import './MapComponent.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const defaultCenter = [-7.581020, 110.770065]; // Kantor - Solo, Indonesia

// SVG icons matching dashboard Lucide icons
const getIconSvg = (typeName) => {
  const typeLower = (typeName || '').toLowerCase();

  // Site icon - Building icon (Lucide)
  if (typeLower === 'site') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
  }

  // POP - Building2 icon (Lucide)
  if (typeLower === 'pop') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
  }
  // OTB - GalleryThumbnails icon (Lucide)
  else if (typeLower.includes('otb')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><rect width="5" height="5" x="6" y="6"/><rect width="5" height="5" x="13" y="6"/><rect width="5" height="5" x="6" y="13"/><rect width="5" height="5" x="13" y="13"/></svg>`;
  }
  // Joint Box - Microchip icon (Lucide)
  else if (typeLower.includes('joint') || typeLower.includes('box')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect width="6" height="6" x="9" y="9"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 9h2"/><path d="M2 15h2"/><path d="M20 9h2"/><path d="M20 15h2"/><path d="M9 2h6"/><path d="M9 22h6"/></svg>`;
  }
  // ODC - NotebookTabs icon (Lucide)
  else if (typeLower === 'odc') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h20"/><path d="M2 12h20"/><path d="M2 18h20"/><path d="M6 6v12"/><path d="M12 6v12"/><path d="M18 6v12"/></svg>`;
  }
  // ODP - Notebook icon (Lucide)
  else if (typeLower === 'odp') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`;
  }
  // Server - Server icon (Lucide)
  else if (typeLower === 'server') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`;
  }
  // Router - Router icon (Lucide)
  else if (typeLower === 'router') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2"/><path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 13h2"/><path d="M18 11v2"/></svg>`;
  }
  // Switch - Network icon (Lucide)
  else if (typeLower === 'switch') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`;
  }
  // OLT - Cpu icon (Lucide)
  else if (typeLower === 'olt') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" x2="9.01" y1="1" y2="4"/><line x1="15" x2="15.01" y1="1" y2="4"/><line x1="9" x2="9.01" y1="20" y2="23"/><line x1="15" x2="15.01" y1="20" y2="23"/><line x1="20" x2="23" y1="9" y2="9.01"/><line x1="20" x2="23" y1="14" y2="14.01"/><line x1="1" x2="4" y1="9" y2="9.01"/><line x1="1" x2="4" y1="14" y2="14.01"/></svg>`;
  }
  // Tiang - Flag icon (Lucide)
  else if (typeLower === 'tiang') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;
  }
  // Default - Circle icon
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
};

// Component to fly to location
const FlyToLocation = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position && Array.isArray(position) && position.length === 2) {
      const lat = parseFloat(position[0]);
      const lng = parseFloat(position[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.flyTo(position, 15, {
          duration: 2
        });
      }
    }
  }, [position, map]);

  return null;
};

// Component to set initial view to POP SOLO or fit all infrastructures
const SetInitialView = ({ infrastructures }) => {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current || infrastructures.length === 0) return;
    hasInitialized.current = true;

    // Filter to only valid coordinates
    const validInfras = infrastructures.filter(infra => {
      const lat = parseFloat(infra.latitude);
      const lng = parseFloat(infra.longitude);
      return !isNaN(lat) && !isNaN(lng);
    });

    if (validInfras.length === 0) return;

    // Try to find POP SOLO first with valid coordinates
    const popSolo = validInfras.find(infra => {
      const name = infra.name ? infra.name.toLowerCase() : '';
      return (name.includes('ldp') || name.includes('lintas')) && name.includes('pop solo');
    });

    if (popSolo) {
      const position = [parseFloat(popSolo.latitude), parseFloat(popSolo.longitude)];
      if (!isNaN(position[0]) && !isNaN(position[1])) {
        map.setView(position, 16, {
          animate: true,
          duration: 1.5
        });
      }
    } else {
      // If no POP SOLO found, fit bounds to show all valid infrastructures
      if (validInfras.length > 0) {
        const bounds = L.latLngBounds(
          validInfras.map(infra => [
            parseFloat(infra.latitude),
            parseFloat(infra.longitude)
          ])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [infrastructures, map]);

  return null;
};

const MapComponent = ({ targetLocation }) => {
  const [infrastructures, setInfrastructures] = useState([]);
  const [sites, setSites] = useState([]);
  const [connections, setConnections] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const hasLoaded = useRef(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) {
      fetchData();
      hasLoaded.current = true;
    }
  }, []);

  // Handle targetLocation from Admin Panel
  useEffect(() => {
    if (targetLocation && targetLocation.lat && targetLocation.lng) {
      setSelectedLocation([targetLocation.lat, targetLocation.lng]);
      hasInitialized.current = false; // Reset to allow SetInitialView to skip
    }
  }, [targetLocation]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const infRes = await infrastructureService.getAllForMap();
      setInfrastructures(infRes.data);

      const siteRes = await siteService.getForMap();
      setSites(siteRes.data);

      const cableRes = await cableService.getAll();
      setConnections(cableRes.data);

      const clientRes = await clientService.getForMap();
      setClients(clientRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    try {
      // Using Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 500);
  };

  const handleSelectLocation = (result) => {
    setSelectedLocation([parseFloat(result.lat), parseFloat(result.lon)]);
    setShowResults(false);
    setSearchQuery(result.display_name);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSelectedLocation(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'inactive':
        return '#FFC107';
      case 'maintenance':
        return '#FF9800';
      default:
        return '#999999';
    }
  };

  const getCableColor = (cableType) => {
    const typeMap = {
      'Duct Cable': '#2196F3',
      'Direct Buried Cable': '#4CAF50',
      'Aerial Cable': '#FF9800',
      'Dropcore': '#9C27B0',
      'Dropcore Tube': '#BA68C8',
      'Figure 8': '#E91E63',
      'Mini ADSS': '#3F51B5',
      'ADSS': '#303F9F',
      'SCPT': '#00BCD4',
      'Indoor Cable': '#FF5722',
    };
    return typeMap[cableType] || '#607D8B';
  };

  const createIconMarker = (infraType) => {
    const color = getColorByType(infraType);
    const svgIcon = getIconSvg(infraType);
    const size = 44;

    const iconHtml = `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    ">${svgIcon}</div>`;

    return L.divIcon({
      html: iconHtml,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
      className: 'custom-icon-marker',
    });
  };

  // Get color for site based on site type
  const getSiteColor = (siteType) => {
    const colorMap = {
      'pop': '#667eea',
      'datacenter': '#5f27cd',
    };
    return colorMap[siteType] || '#667eea';
  };

  // Create site marker icon
  const createSiteIcon = (site) => {
    const color = getSiteColor(site.site_type);
    const svgIcon = getIconSvg('site');
    const size = 48;

    const iconHtml = `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    ">${svgIcon}</div>`;

    return L.divIcon({
      html: iconHtml,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
      className: 'custom-site-marker',
    });
  };

  // Create client marker icon
  const createClientIcon = (status) => {
    const colorMap = {
      active: '#22c55e',
      pending: '#f59e0b',
      inactive: '#6b7280',
      suspended: '#ef4444'
    };
    const color = colorMap[status] || '#6b7280';
    const size = 36;

    const iconHtml = `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>`;

    return L.divIcon({
      html: iconHtml,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
      className: 'custom-client-marker',
    });
  };

  if (loading) {
    return <div className="map-loading">Loading map data...</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Search Bar */}
      <div className="map-search-container">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            placeholder="Search location (city, address, landmark...)"
            className="map-search-input"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={handleClearSearch}>
              ✕
            </button>
          )}
          {searching && <div className="search-spinner">⏳</div>}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="search-results-dropdown">
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                className="search-result-item"
                onClick={() => handleSelectLocation(result)}
              >
                <span className="result-icon">📍</span>
                <div className="result-text">
                  <div className="result-name">{result.display_name.split(',')[0]}</div>
                  <div className="result-address">{result.display_name}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showResults && searchResults.length === 0 && searchQuery.length >= 3 && !searching && (
          <div className="search-results-dropdown">
            <div className="search-result-item no-results">
              No results found for "{searchQuery}"
            </div>
          </div>
        )}
      </div>

      <MapContainer center={defaultCenter} zoom={16} minZoom={5} maxZoom={19} style={{ width: '100%', height: '100%' }} zoomControl={true}>
        {/* Esri Satellite - dengan maxNativeZoom untuk batas tiles */}
        <TileLayer
          attribution='&copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={18}
          maxZoom={19}
        />
        {/* Label untuk satellite */}
        <TileLayer
          attribution='&copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/Labels/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={18}
          maxZoom={19}
          opacity={0.7}
        />

        {/* Set initial view to POP SOLO */}
        <SetInitialView infrastructures={infrastructures} />

        {/* Fly to selected location */}
        <FlyToLocation position={selectedLocation} />

        {/* Draw cables as lines */}
        {connections.map((cable) => {
          // Parse path_coordinates from JSON
          let pathCoordinates = null;
          if (cable.path_coordinates) {
            try {
              pathCoordinates = typeof cable.path_coordinates === 'string'
                ? JSON.parse(cable.path_coordinates)
                : cable.path_coordinates;
            } catch (e) {
              console.warn('Could not parse path_coordinates:', e);
            }
          }

          if (!pathCoordinates || pathCoordinates.length < 2) return null;

          // Get cable type info for color
          const cableType = cable.cable_type?.name || 'Unknown';

          return (
            <Polyline
              key={cable.id}
              positions={pathCoordinates.map(coord => [coord[0], coord[1]])}
              color={getCableColor(cableType)}
              opacity={0.8}
              weight={3}
            >
              <Popup>
                <div className="cable-popup">
                  <strong>{cable.name}</strong>
                  <br />
                  Type: {cableType}
                  <br />
                  Length: {cable.length}m
                  <br />
                  Cores: {cable.core_count}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Cable polylines for infrastructure type "Kabel" */}
        {infrastructures
          .filter((infra) => {
            if (infra.type?.name !== 'Kabel' || !infra.path_coordinates) return false;
            // Parse path_coordinates if it's a string
            const coords = typeof infra.path_coordinates === 'string'
              ? JSON.parse(infra.path_coordinates)
              : infra.path_coordinates;
            return Array.isArray(coords) && coords.length > 1;
          })
          .map((cable) => {
            // Parse path_coordinates if it's a string
            const pathCoords = typeof cable.path_coordinates === 'string'
              ? JSON.parse(cable.path_coordinates)
              : cable.path_coordinates;

            return (
              <Polyline
                key={`cable-${cable.id}`}
                positions={pathCoords}
                color={getColorByType('Kabel')}
                weight={4}
                opacity={0.7}
              >
                <Popup>
                  <div className="marker-popup">
                    <h4 style={{ margin: '0 0 10px 0' }}>{cable.name}</h4>
                    <p><strong>Type:</strong> Cable/Fiber</p>
                    <p><strong>Status:</strong> <span style={{ color: getStatusColor(cable.status) }}>●</span> {cable.status}</p>
                    <p><strong>Length:</strong> {cable.cable_length ? `${(parseFloat(cable.cable_length) / 1000).toFixed(2)} km` : 'N/A'}</p>
                    <p><strong>Points:</strong> {pathCoords.length}</p>
                    {cable.description && <p><strong>Description:</strong> {cable.description}</p>}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {/* Site markers */}
        {sites
          .filter((site) => {
            const lat = parseFloat(site.latitude);
            const lng = parseFloat(site.longitude);
            return !isNaN(lat) && !isNaN(lng);
          })
          .map((site) => (
            <Marker
              key={`site-${site.id}`}
              position={[parseFloat(site.latitude), parseFloat(site.longitude)]}
              icon={createSiteIcon(site)}
            >
              <Popup>
                <div className="marker-popup">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{
                      backgroundColor: getSiteColor(site.site_type),
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 4,
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
                    </div>
                    <h4 style={{ margin: 0 }}>{site.name}</h4>
                  </div>
                  <p><strong>Code:</strong> {site.code}</p>
                  <p><strong>Type:</strong> {site.site_type}</p>
                  <p><strong>Status:</strong> <span style={{ color: getStatusColor(site.status) }}>●</span> {site.status}</p>
                  {site.radius_km > 0 && <p><strong>Coverage Radius:</strong> {site.radius_km} km</p>}
                  <p><strong>Location:</strong> {parseFloat(site.latitude).toFixed(4)}, {parseFloat(site.longitude).toFixed(4)}</p>
                  {site.address && <p><strong>Address:</strong> {site.address}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Client markers */}
        {clients
          .filter((client) => {
            const lat = parseFloat(client.latitude);
            const lng = parseFloat(client.longitude);
            return !isNaN(lat) && !isNaN(lng);
          })
          .map((client) => (
            <Marker
              key={`client-${client.id}`}
              position={[parseFloat(client.latitude), parseFloat(client.longitude)]}
              icon={createClientIcon(client.status)}
            >
              <Popup>
                <div className="marker-popup">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{
                      backgroundColor: client.status === 'active' ? '#22c55e' : client.status === 'pending' ? '#f59e0b' : '#6b7280',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 4,
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <h4 style={{ margin: 0 }}>{client.name}</h4>
                  </div>
                  <p><strong>Status:</strong> <span style={{ color: client.status === 'active' ? '#22c55e' : client.status === 'pending' ? '#f59e0b' : '#6b7280' }}>●</span> {client.status}</p>
                  {client.package_type && <p><strong>Paket:</strong> {client.package_type}</p>}
                  {client.phone && <p><strong>Telepon:</strong> {client.phone}</p>}
                  {client.address && <p><strong>Alamat:</strong> {client.address}</p>}
                  {client.infrastructure_name && <p><strong>Terhubung ke:</strong> {client.infrastructure_name}</p>}
                  {client.site_name && <p><strong>Site:</strong> {client.site_name}</p>}
                  <p><strong>Location:</strong> {parseFloat(client.latitude).toFixed(4)}, {parseFloat(client.longitude).toFixed(4)}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Infrastructure markers (non-cable types and cables without path) */}
        {infrastructures
          .filter((infra) => {
            // Skip invalid coordinates
            const lat = parseFloat(infra.latitude);
            const lng = parseFloat(infra.longitude);
            if (isNaN(lat) || isNaN(lng)) return false;
            return infra.type?.name !== 'Kabel' || !infra.path_coordinates;
          })
          .map((infra) => {
            const color = getColorByType(infra.type?.name);
            const svgIcon = getIconSvg(infra.type?.name);

            return (
              <Marker
                key={infra.id}
                position={[parseFloat(infra.latitude), parseFloat(infra.longitude)]}
                icon={createIconMarker(infra.type?.name)}
              >
                <Popup>
                  <div className="marker-popup">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div dangerouslySetInnerHTML={{ __html: `
                        <div style="
                          background-color: ${color};
                          width: 32px;
                          height: 32px;
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          padding: 4px;
                        ">${svgIcon}</div>
                      `}} />
                      <h4 style={{ margin: 0 }}>{infra.name}</h4>
                    </div>
                    <p><strong>Type:</strong> {infra.type?.name}</p>
                    <p><strong>Status:</strong> <span style={{ color: getStatusColor(infra.status) }}>●</span> {infra.status}</p>
                    <p><strong>Location:</strong> {parseFloat(infra.latitude).toFixed(4)}, {parseFloat(infra.longitude).toFixed(4)}</p>
                    {infra.description && <p><strong>Description:</strong> {infra.description}</p>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
