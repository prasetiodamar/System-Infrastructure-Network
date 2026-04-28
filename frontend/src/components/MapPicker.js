import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { infrastructureService, cableService, siteService } from '../services/services';
import { FaSearch } from 'react-icons/fa';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPicker.css';

// Fix default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const customIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Component to fly to location
const FlyToLocation = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position && position.lat != null && position.lng != null) {
      // Convert object {lat, lng} to array [lat, lng] if needed
      const positionArray = Array.isArray(position) ? position : [position.lat, position.lng];
      console.log('Flying to:', positionArray);
      // Use setTimeout to ensure map is ready
      setTimeout(() => {
        map.flyTo(positionArray, 15, {
          duration: 2
        });
      }, 100);
    }
  }, [position, map]);

  return null;
};

const MapClickHandler = ({ onLocationSelect, readOnly }) => {
  useMapEvents({
    click(e) {
      if (!readOnly) {
        onLocationSelect(e.latlng);
      }
    },
  });
  return null;
};

// Component to auto-center map on all data
const AutoCenterMap = ({ infrastructures, sites, cables }) => {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Collect all valid coordinates
    const allCoords = [];

    // Add site coordinates
    sites.forEach(site => {
      const lat = parseFloat(site.latitude);
      const lng = parseFloat(site.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        allCoords.push([lat, lng]);
      }
    });

    // Add infrastructure coordinates
    infrastructures.forEach(infra => {
      const lat = parseFloat(infra.latitude);
      const lng = parseFloat(infra.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        allCoords.push([lat, lng]);
      }
    });

    // Add cable path coordinates
    cables.forEach(cable => {
      if (cable.path_coordinates) {
        try {
          const pathCoords = typeof cable.path_coordinates === 'string'
            ? JSON.parse(cable.path_coordinates)
            : cable.path_coordinates;
          if (Array.isArray(pathCoords)) {
            pathCoords.forEach(coord => {
              if (!isNaN(parseFloat(coord[0])) && !isNaN(parseFloat(coord[1]))) {
                allCoords.push([parseFloat(coord[0]), parseFloat(coord[1])]);
              }
            });
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    });

    if (allCoords.length > 0) {
      try {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (e) {
        console.warn('Error fitting bounds:', e);
        // Fallback to first coordinate
        if (allCoords.length > 0) {
          map.setView(allCoords[0], 13);
        }
      }
    }
  }, [infrastructures, sites, cables, map]);

  return null;
};

const MapPicker = ({ onLocationSelect, initialLocation, readOnly = false }) => {
  const [infrastructures, setInfrastructures] = useState([]);
  const [cables, setCables] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    loadInfrastructures();
    loadCables();
    loadSites();
  }, []);

  useEffect(() => {
    setSelectedLocation(initialLocation);
  }, [initialLocation]);

  const loadSites = async () => {
    try {
      const response = await siteService.getForMap();
      setSites(response.data);
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  };

  const loadInfrastructures = async () => {
    try {
      const response = await infrastructureService.getAll();
      setInfrastructures(response.data);
    } catch (error) {
      console.error('Error loading infrastructures:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCables = async () => {
    try {
      const response = await cableService.getAll();
      console.log('Cables loaded:', response.data);
      setCables(response.data);
    } catch (error) {
      console.error('Error loading cables:', error);
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

  const handleSelectSearchResult = (result) => {
    const newLocation = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };
    // Hanya zoom map ke lokasi, jangan pilih lokasi
    setFlyToLocation(newLocation);
    setShowResults(false);
    setSearchQuery(result.display_name);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handleMapClick = (latlng) => {
    const newLocation = {
      lat: latlng.lat,
      lng: latlng.lng,
    };
    setSelectedLocation(newLocation);
    setFlyToLocation(newLocation);
    if (onLocationSelect) {
      onLocationSelect(newLocation);
    }
  };

  const getColorByType = (type) => {
    const colorMap = {
      'POP': '#e74c3c',
      'ODP': '#3498db',
      'OLT': '#9b59b6',
      'OTB': '#2ecc71',
      'Joint Box': '#f39c12',
      'Distribution Box': '#1abc9c',
      'Feeder Cable': '#34495e',
      'Drop Cable': '#95a5a6',
      'Splice Point': '#e67e22',
    };
    return colorMap[type] || '#7f8c8d';
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

  // Create site marker icon
  const createSiteIcon = (site) => {
    const colorMap = {
      'pop': '#667eea',
      'datacenter': '#5f27cd',
    };
    const color = colorMap[site.site_type?.toLowerCase()] || '#667eea';
    const size = 40;

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
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
        <path d="M10 6h4"/>
        <path d="M10 10h4"/>
        <path d="M10 14h4"/>
        <path d="M10 18h4"/>
      </svg>
    </div>`;

    return L.divIcon({
      html: iconHtml,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
      className: 'custom-site-marker',
    });
  };

  // Create custom icon for infrastructure
  const createInfraIcon = (infrastructure) => {
    const color = getColorByType(infrastructure.type?.name);
    const size = 36;

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
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    </div>`;

    return L.divIcon({
      html: iconHtml,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  };

  return (
    <div className="map-picker">
      <div className="map-picker-header">
        <h3>Select Location on Map</h3>
        {!readOnly && (
          <p className="map-picker-hint">Click anywhere on the map to select location</p>
        )}
        {selectedLocation && (
          <div className="selected-coordinates">
            Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div style={{ padding: '10px', textAlign: 'center', background: '#f5f5f5', borderRadius: '4px', marginBottom: '10px', fontSize: '13px' }}>
          Loading map data...
        </div>
      )}

      {/* Debug info - shows loaded counts */}
      {!loading && (
        <div style={{ padding: '8px', textAlign: 'center', background: sites.length > 0 ? '#e8f5e9' : '#ffebee', borderRadius: '4px', marginBottom: '10px', fontSize: '12px', color: sites.length > 0 ? '#2e7d32' : '#c62828' }}>
          📍 {sites.length} sites | 🏗️ {infrastructures.length} infrastructures | 🔌 {cables.length} cables
        </div>
      )}

      {/* Map with search overlay */}
      <div style={{ position: 'relative', height: '400px', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Search Bar - positioned inside map */}
        {!readOnly && (
          <div className="map-search-container" style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '90%', maxWidth: '350px' }}>
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Search location..."
                className="search-input"
                style={{ fontSize: '13px', padding: '8px 30px 8px 35px' }}
              />
              {searchQuery && (
                <button
                  className="clear-search-btn"
                  onClick={handleClearSearch}
                  style={{ width: '20px', height: '20px', fontSize: '14px' }}
                >
                  ×
                </button>
              )}
            </div>
            {searching && (
              <div className="searching-indicator">Searching...</div>
            )}
            {showResults && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="search-result-item"
                    onClick={() => handleSelectSearchResult(result)}
                  >
                    <div className="result-name">{result.display_name.split(',')[0]}</div>
                    <div className="result-coords">
                      {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <MapContainer
          center={selectedLocation || [-6.2088, 106.8456]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/Labels/MapServer/tile/{z}/{y}/{x}"
          opacity={0.5}
        />

        <FlyToLocation position={flyToLocation} />

        <AutoCenterMap
          infrastructures={infrastructures}
          sites={sites}
          cables={cables}
        />

        <MapClickHandler
          onLocationSelect={handleMapClick}
          readOnly={readOnly}
        />

        {/* Show site markers */}
        {!loading && sites.map((site) => {
          const lat = parseFloat(site.latitude);
          const lng = parseFloat(site.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          return (
            <Marker
              key={`site-${site.id}`}
              position={[lat, lng]}
              icon={createSiteIcon(site)}
            >
              <Popup>
                <div className="marker-popup">
                  <strong>{site.name}</strong>
                  <br />
                  Type: {site.site_type || 'Site'}
                  <br />
                  Status: {site.status || 'Active'}
                  {site.address && (
                    <>
                      <br />
                      Address: {site.address}
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Show all existing infrastructure markers */}
        {!loading && infrastructures.filter(infra => infra.latitude && infra.longitude).map((infra) => (
          <Marker
            key={infra.id}
            position={[infra.latitude, infra.longitude]}
            icon={createInfraIcon(infra)}
          >
            <Popup>
              <div className="marker-popup">
                <strong>{infra.name}</strong>
                <br />
                Type: {infra.type?.name}
                <br />
                Address: {infra.address}
                {infra.type?.name?.toLowerCase().includes('otb') && (
                  <>
                    <br />
                    Ports: {infra.ports_count || 0} / {infra.type?.name?.match(/\d+/)?.[0] || 0}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Draw cables as lines */}
        {cables.filter(cable => cable.path_coordinates).map((cable) => {
          console.log('Rendering cable:', cable.name, 'path_coords:', cable.path_coordinates);

          // Parse path_coordinates from JSON
          let pathCoordinates = null;
          if (cable.path_coordinates) {
            try {
              pathCoordinates = typeof cable.path_coordinates === 'string'
                ? JSON.parse(cable.path_coordinates)
                : cable.path_coordinates;
              console.log('Parsed pathCoordinates:', pathCoordinates);
            } catch (e) {
              console.warn('Could not parse path_coordinates:', e);
            }
          }

          if (!pathCoordinates || pathCoordinates.length < 2) {
            console.log('Skipping cable - no valid path_coordinates');
            return null;
          }

          // Get cable type info for color
          const cableType = cable.cable_type?.name || 'Unknown';

          return (
            <Polyline
              key={cable.id}
              positions={pathCoordinates.map(coord => [coord[0], coord[1]])}
              color={getCableColor(cableType)}
              opacity={0.7}
              weight={3}
              dashArray="5, 10"
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
            console.log('Rendering infrastructure cable:', cable.name);
            // Parse path_coordinates if it's a string
            const pathCoords = typeof cable.path_coordinates === 'string'
              ? JSON.parse(cable.path_coordinates)
              : cable.path_coordinates;

            return (
              <Polyline
                key={`infra-cable-${cable.id}`}
                positions={pathCoords.map(coord => [coord[0], coord[1]])}
                color="#FF5722"
                opacity={0.7}
                weight={3}
                dashArray="5, 10"
              >
                <Popup>
                  <div className="cable-popup">
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

        {/* Show selected location marker */}
        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={customIcon('#ff0000')}
          >
            <Popup>
              <strong>Selected Location</strong>
              <br />
              Lat: {selectedLocation.lat.toFixed(6)}
              <br />
              Lng: {selectedLocation.lng.toFixed(6)}
            </Popup>
          </Marker>
        )}
      </MapContainer>
      </div>
    </div>
  );
};

export default MapPicker;
