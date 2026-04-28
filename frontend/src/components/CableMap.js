import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { infrastructureService } from '../services/services';
import { getColorByType } from '../utils/iconMapping';
import './CableMap.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to fit bounds to show all infrastructures
const FitBounds = ({ infrastructures }) => {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current || infrastructures.length === 0) return;
    hasInitialized.current = true;

    // Filter out invalid coordinates
    const validInfras = infrastructures.filter(infra => {
      const lat = parseFloat(infra.latitude);
      const lng = parseFloat(infra.longitude);
      return !isNaN(lat) && !isNaN(lng);
    });

    if (validInfras.length === 0) return;

    const bounds = L.latLngBounds(
      validInfras.map(infra => [
        parseFloat(infra.latitude),
        parseFloat(infra.longitude)
      ])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [infrastructures, map]);

  return null;
};

const CableMap = ({ cables }) => {
  const [infrastructures, setInfrastructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) {
      fetchInfrastructures();
      hasLoaded.current = true;
    }
  }, []);

  const fetchInfrastructures = async () => {
    try {
      setLoading(true);
      const response = await infrastructureService.getAllForMap();
      setInfrastructures(response.data);
    } catch (error) {
      console.error('Error loading infrastructures:', error);
    } finally {
      setLoading(false);
    }
  };

  // SVG icons matching dashboard Lucide icons
  const getIconSvg = (typeName) => {
    const typeLower = (typeName || '').toLowerCase();

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

  const createCustomIcon = (infrastructure) => {
    const color = getColorByType(infrastructure.type?.name);
    const svgIcon = getIconSvg(infrastructure.type?.name);
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
      className: 'custom-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  };

  // Get cable paths for display
  const cablePaths = cables.filter(cable =>
    cable.fromInfrastructure?.latitude &&
    cable.fromInfrastructure?.longitude &&
    cable.toInfrastructure?.latitude &&
    cable.toInfrastructure?.longitude &&
    cable.path_coordinates
  ).map(cable => {
    const path = typeof cable.path_coordinates === 'string'
      ? JSON.parse(cable.path_coordinates)
      : cable.path_coordinates;

    return {
      positions: path.map(coord => [coord.lat, coord.lng]),
      color: cable.cable_type?.color || '#607D8B',
      name: cable.name,
      id: cable.id,
    };
  });

  if (loading) {
    return (
      <div className="cable-map-container">
        <div className="map-loading">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="cable-map-container">
      <MapContainer
        center={[-6.2088, 106.8456]}
        zoom={13}
        style={{ height: '500px', width: '100%' }}
      >
        {/* Satellite Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {/* Labels overlay for better readability */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          opacity={0.5}
        />

        <FitBounds infrastructures={infrastructures} />

        {/* Infrastructure Markers */}
        {infrastructures.map((infra) => {
          const lat = parseFloat(infra.latitude);
          const lng = parseFloat(infra.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          const position = [lat, lng];

          return (
            <Marker
              key={infra.id}
              position={position}
              icon={createCustomIcon(infra)}
            >
              <Popup>
                <div className="map-popup">
                  <h4>{infra.name}</h4>
                  <p><strong>Type:</strong> {infra.type?.name || 'N/A'}</p>
                  <p><strong>Status:</strong> {infra.status || 'N/A'}</p>
                  {infra.description && <p><strong>Description:</strong> {infra.description}</p>}
                  {infra.pop && <p><strong>Connected to POP:</strong> {infra.pop.name}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Cable Paths */}
        {cablePaths.map((path, idx) => (
          <Polyline
            key={`cable-${path.id || idx}`}
            positions={path.positions}
            color={path.color}
            weight={3}
            opacity={0.7}
          >
            <Popup>
              <div className="map-popup">
                <h4>{path.name}</h4>
              </div>
            </Popup>
          </Polyline>
        ))}
      </MapContainer>
    </div>
  );
};

export default CableMap;
