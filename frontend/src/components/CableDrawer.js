import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { kmlImportService, infrastructureService, cableService, siteService } from '../services/services';
import { getColorByType } from '../utils/iconMapping';
import CoreAllocationModal from './CoreAllocationModal';
import 'leaflet/dist/leaflet.css';
import './CableDrawer.css';

// Component to handle map fitting - only fits bounds when NOT drawing
const MapFitter = ({ pathCoordinates, isDrawing }) => {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    // Only auto-fit when NOT drawing and has path coordinates
    if (!isDrawing && pathCoordinates && pathCoordinates.length > 1 && !hasFitted.current) {
      hasFitted.current = true;
      try {
        const bounds = pathCoordinates.map(coord => [coord[0], coord[1]]);
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (e) {
        console.warn('Error fitting bounds:', e);
      }
    }
  }, [pathCoordinates, isDrawing, map]);

  return null;
};

// Component to auto-center map on infrastructure and site data
const AutoCenterMap = ({ infrastructures, sites, isDrawing }) => {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Only auto-center when NOT drawing
    if (isDrawing) return;

    // Collect all valid coordinates from sites and infrastructures
    const allCoords = [];

    // Add site coordinates
    sites.forEach(site => {
      const lat = parseFloat(site.latitude);
      const lng = parseFloat(site.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        allCoords.push([lat, lng]);
      }
    });

    // Add infrastructure coordinates (if available)
    infrastructures.forEach(infra => {
      const lat = parseFloat(infra.latitude);
      const lng = parseFloat(infra.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        allCoords.push([lat, lng]);
      }
    });

    console.log('AutoCenterMap: valid coordinates found:', allCoords.length);

    if (allCoords.length > 0) {
      try {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (e) {
        console.warn('Error fitting bounds:', e);
        // Fallback to first coordinate
        map.setView(allCoords[0], 15);
      }
    }
  }, [infrastructures, sites, isDrawing, map]);

  return null;
};

// Component to handle map drawing
const DrawingHandler = ({ isDrawing, pathCoordinates, setPathCoordinates }) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      if (isDrawing) {
        const newPoint = [e.latlng.lat, e.latlng.lng];
        setPathCoordinates([...pathCoordinates, newPoint]);
      }
    },
  });

  useEffect(() => {
    if (isDrawing) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [isDrawing, map]);

  return null;
};

const CableDrawer = ({ onPathChange, initialPath = null, initialCenter = null }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [pathCoordinates, setPathCoordinates] = useState(initialPath || []);
  const [showImportKml, setShowImportKml] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [infrastructures, setInfrastructures] = useState([]);
  const [sites, setSites] = useState([]);
  const [loadingInfra, setLoadingInfra] = useState(true);
  const [existingCables, setExistingCables] = useState([]);
  const [loadingCables, setLoadingCables] = useState(true);
  const [selectedCableForCores, setSelectedCableForCores] = useState(null);
  const [showCoreModal, setShowCoreModal] = useState(false);
  const mapRef = useRef();
  const fileInputRef = useRef();

  // Compute default center from infrastructure data
  const getDefaultCenter = () => {
    // If initialPath exists and has valid coordinates, use it
    if (initialPath && initialPath.length > 0 && !isNaN(initialPath[0][0]) && !isNaN(initialPath[0][1])) {
      return initialPath[0];
    }
    // Find first infrastructure with valid coordinates
    const validInfra = infrastructures.find(infra => {
      const lat = parseFloat(infra.latitude);
      const lng = parseFloat(infra.longitude);
      return !isNaN(lat) && !isNaN(lng);
    });
    if (validInfra) {
      return [parseFloat(validInfra.latitude), parseFloat(validInfra.longitude)];
    }
    // Default to Jakarta
    return [-6.2088, 106.8456];
  };

  const computedCenter = getDefaultCenter();
  const hasLoadedInfra = useRef(false);
  const hasLoadedCables = useRef(false);

  // Load infrastructures and cables
  useEffect(() => {
    if (!hasLoadedInfra.current) {
      fetchInfrastructures();
      hasLoadedInfra.current = true;
    }
    if (!hasLoadedCables.current) {
      fetchExistingCables();
      hasLoadedCables.current = true;
    }
  }, []);

  const fetchInfrastructures = async () => {
    try {
      setLoadingInfra(true);
      // Fetch both infrastructures and sites
      const [infraRes, siteRes] = await Promise.all([
        infrastructureService.getAllForMap(),
        siteService.getForMap()
      ]);

      console.log('CableDrawer - Loaded infrastructures:', infraRes.data.length);
      console.log('CableDrawer - Loaded sites:', siteRes.data.length, siteRes.data);

      setInfrastructures(infraRes.data);
      setSites(siteRes.data);
    } catch (error) {
      console.error('Error loading infrastructures:', error);
    } finally {
      setLoadingInfra(false);
    }
  };

  const fetchExistingCables = async () => {
    try {
      setLoadingCables(true);
      const response = await cableService.getAll();
      // Also fetch cores for each cable
      const cablesWithCores = await Promise.all(
        response.data.map(async (cable) => {
          try {
            const coresRes = await cableService.getCores(cable.id);
            return { ...cable, cores: coresRes.data };
          } catch (e) {
            return { ...cable, cores: [] };
          }
        })
      );
      setExistingCables(cablesWithCores);
    } catch (error) {
      console.error('Error loading cables:', error);
    } finally {
      setLoadingCables(false);
    }
  };

  const handleOpenCoreAllocation = (cable) => {
    setSelectedCableForCores(cable);
    setShowCoreModal(true);
  };

  const handleCloseCoreModal = () => {
    setShowCoreModal(false);
    setSelectedCableForCores(null);
    // Refresh cables to show updated core info
    fetchExistingCables();
  };

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

  // Get color for site based on site type
  const getSiteColor = (siteType) => {
    const colorMap = {
      'pop': '#667eea',
      'datacenter': '#5f27cd',
    };
    return colorMap[siteType?.toLowerCase()] || '#667eea';
  };

  // Create site marker icon - matching MapComponent style
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

  // Create custom icon for infrastructure
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
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  };

  // Update pathCoordinates when initialPath changes (from parent)
  useEffect(() => {
    if (initialPath && Array.isArray(initialPath) && initialPath.length > 0) {
      setPathCoordinates(initialPath);
    }
  }, [initialPath]);

  // Only call onPathChange when user actually draws on the map (not from parent)
  const handlePathUpdate = (newPath) => {
    setPathCoordinates(newPath);
    if (onPathChange) {
      onPathChange(newPath);
    }
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClearPath = () => {
    handlePathUpdate([]);
    setIsDrawing(false);
  };

  const handleUndoLast = () => {
    if (pathCoordinates.length > 0) {
      handlePathUpdate(pathCoordinates.slice(0, -1));
    }
  };

  const handleImportKml = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportLoading(true);
    setImportError('');
    setImportSuccess('');

    kmlImportService
      .parseKml(file)
      .then((response) => {
        const lines = response.data?.lines || [];
        if (lines.length === 0) {
          setImportError('No cable routes found in the file');
          return;
        }

        const firstLine = lines[0];
        if (firstLine.coordinates && firstLine.coordinates.length >= 2) {
          handlePathUpdate(firstLine.coordinates);
          setImportSuccess(`Imported "${firstLine.name}" with ${firstLine.coordinates.length} points`);
          setShowImportKml(false);
          setTimeout(() => setImportSuccess(''), 3000);
        } else {
          setImportError('Invalid cable route format');
        }
      })
      .catch((error) => {
        const errorMessage = error.response?.data?.message || error.message || 'Error parsing KML file';
        setImportError(errorMessage);
      })
      .finally(() => {
        setImportLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
  };

  const calculateDistance = () => {
    if (pathCoordinates.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < pathCoordinates.length - 1; i++) {
      const from = L.latLng(pathCoordinates[i][0], pathCoordinates[i][1]);
      const to = L.latLng(pathCoordinates[i + 1][0], pathCoordinates[i + 1][1]);
      totalDistance += from.distanceTo(to);
    }
    return totalDistance;
  };

  const distance = calculateDistance();

  return (
    <div className="cable-drawer">
      {/* Control Panel */}
      <div className="cable-control-panel">
        {/* Drawing Tools Section */}
        <div className="control-section">
          <h4 className="section-title">Drawing Tools</h4>
          <div className="drawing-buttons">
            {!isDrawing ? (
              <button type="button" className="btn btn-draw" onClick={handleStartDrawing}>
                Start Drawing
              </button>
            ) : (
              <button type="button" className="btn btn-stop" onClick={handleStopDrawing}>
                Stop Drawing
              </button>
            )}
            <button type="button" className="btn btn-undo" onClick={handleUndoLast} disabled={pathCoordinates.length === 0}>
              Undo Last
            </button>
            <button type="button" className="btn btn-clear" onClick={handleClearPath} disabled={pathCoordinates.length === 0}>
              Clear All
            </button>
            <button
              type="button"
              className="btn btn-refresh"
              onClick={() => {
                fetchInfrastructures();
                fetchExistingCables();
              }}
              disabled={loadingInfra || loadingCables}
              style={{ marginTop: '8px', width: '100%' }}
            >
              {loadingInfra || loadingCables ? 'Loading...' : '🔄 Refresh Map'}
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="control-section">
          <h4 className="section-title">Import Route</h4>
          <button type="button" className="btn btn-import-kml" onClick={() => setShowImportKml(!showImportKml)}>
            {showImportKml ? 'Close' : 'Import KML/KMZ File'}
          </button>

          {showImportKml && (
            <div className="import-kml-section">
              <div className="import-instructions">
                <p>Select a .KML or .KMZ file exported from Google Earth</p>
              </div>

              {importError && (
                <div className="import-error">
                  <strong>Error:</strong> {importError}
                </div>
              )}
              {importSuccess && (
                <div className="import-success">
                  <strong>Success:</strong> {importSuccess}
                </div>
              )}

              <div className="file-input-wrapper">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".kml,.kmz"
                  onChange={handleImportKml}
                  disabled={importLoading}
                  className="kml-file-input"
                  id="kml-file-input"
                />
                <label htmlFor="kml-file-input" className="file-input-label">
                  <span className="file-icon">📤</span>
                  <span className="file-text">
                    {importLoading ? 'Processing...' : 'Click to Select File'}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="control-section">
          <h4 className="section-title">Cable Information</h4>
          <div className="cable-info">
            <div className="info-item">
              <span className="info-label">Points:</span>
              <span className="info-value">{pathCoordinates.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Length:</span>
              <span className="info-value">{(distance / 1000).toFixed(2)} km</span>
            </div>
            <div className="info-item">
              <span className="info-label">Distance:</span>
              <span className="info-value">{distance.toFixed(0)} m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {loadingInfra && (
        <div style={{ padding: '10px', textAlign: 'center', background: '#f0f0f0', borderRadius: '4px', marginBottom: '10px' }}>
          Loading map data...
        </div>
      )}

      {/* Debug info - shows loaded site count */}
      {!loadingInfra && sites.length > 0 && (
        <div style={{ padding: '8px', textAlign: 'center', background: '#e8f5e9', borderRadius: '4px', marginBottom: '10px', fontSize: '12px', color: '#2e7d32' }}>
          📍 {sites.length} sites loaded
        </div>
      )}

      {!loadingInfra && sites.length === 0 && (
        <div style={{ padding: '8px', textAlign: 'center', background: '#ffebee', borderRadius: '4px', marginBottom: '10px', fontSize: '12px', color: '#c62828' }}>
          ⚠️ No site data found. Please add sites in the Map section first.
        </div>
      )}

      <MapContainer
        center={computedCenter}
        zoom={13}
        style={{ height: '400px', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          opacity={0.5}
        />

        <MapFitter pathCoordinates={pathCoordinates} isDrawing={isDrawing} />
        <AutoCenterMap infrastructures={infrastructures} sites={sites} isDrawing={isDrawing} />
        <DrawingHandler isDrawing={isDrawing} pathCoordinates={pathCoordinates} setPathCoordinates={handlePathUpdate} />

        {/* Site Markers - Show sites as reference points (like Map sidebar) */}
        {!loadingInfra && sites.map((site, index) => {
          const lat = parseFloat(site.latitude);
          const lng = parseFloat(site.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          const position = [lat, lng];

          return (
            <Marker
              key={`site-${site.id}-${index}`}
              position={position}
              icon={createSiteIcon(site)}
            >
              <Popup>
                <div className="map-popup" style={{ minWidth: '150px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600' }}>
                    {site.name}
                  </h4>
                  <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                    <strong>Type:</strong> {site.site_type || 'Site'}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                    <strong>Status:</strong> {site.status || 'Active'}
                  </p>
                  {site.address && (
                    <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                      <strong>Address:</strong> {site.address}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Infrastructure markers - hidden, showing only sites for now */}
        {/* {!loadingInfra && infrastructures.map((infra, index) => {
          let lat = parseFloat(infra.latitude);
          let lng = parseFloat(infra.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          const position = [lat, lng];
          return (
            <Marker
              key={`infra-${infra.id}-${index}`}
              position={position}
              icon={createCustomIcon(infra)}
            >
              <Popup>
                <div className="map-popup" style={{ minWidth: '150px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600' }}>
                    {infra.name}
                  </h4>
                  <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                    <strong>Type:</strong> {infra.type?.name || 'N/A'}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })} */}

        {/* Existing Cables */}
        {!loadingCables && existingCables.map((cable) => {
          if (!cable.path_coordinates) return null;

          let pathCoords = null;
          try {
            pathCoords = typeof cable.path_coordinates === 'string'
              ? JSON.parse(cable.path_coordinates)
              : cable.path_coordinates;
          } catch (e) {
            console.warn('Could not parse path_coordinates:', e);
            return null;
          }

          if (!Array.isArray(pathCoords) || pathCoords.length < 2) return null;

          // Status-based color for cable (priority over type color)
          const getStatusColor = (status) => {
            const colors = {
              planned: '#9E9E9E',
              installed: '#2196F3',
              spliced: '#9C27B0',
              active: '#4CAF50',
              inactive: '#607D8B',
              maintenance: '#FF9800',
              damaged: '#F44336',
            };
            return colors[status] || '#607D8B';
          };
          const cableColor = cable.status ? getStatusColor(cable.status) : (cable.cable_type?.color || '#607D8B');

          return (
            <React.Fragment key={`existing-cable-${cable.id}`}>
              {/* Cable path */}
              <Polyline
                positions={pathCoords.map(coord => [coord[0], coord[1]])}
                color={cableColor}
                weight={3}
                opacity={0.6}
                dashArray="5, 10"
              >
                <Popup>
                  <div className="map-popup" style={{ minWidth: '180px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600' }}>
                      {cable.name}
                    </h4>
                    <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                      <strong>Type:</strong> {cable.cable_type?.name || 'N/A'}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '11px', color: getStatusColor(cable.status) }}>
                      <strong>Status:</strong> {cable.status || 'N/A'}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                      <strong>Length:</strong> {cable.length ? `${(cable.length / 1000).toFixed(2)} km` : 'N/A'}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                      <strong>Cores:</strong> {cable.core_count || 0}
                    </p>
                    {cable.cores && cable.cores.length > 0 && (
                      <>
                        <p style={{ margin: '4px 0', fontSize: '11px', color: '#4CAF50' }}>
                          <strong>Allocated:</strong> {cable.cores.filter(c => c.status === 'allocated').length}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '11px', color: '#9E9E9E' }}>
                          <strong>Available:</strong> {cable.cores.filter(c => c.status === 'available').length}
                        </p>
                        {cable.cores.filter(c => c.status === 'allocated').length > 0 && (
                          <div style={{ marginTop: '6px', maxHeight: '60px', overflowY: 'auto', fontSize: '10px' }}>
                            <strong style={{ fontSize: '11px' }}>Allocated Cores:</strong>
                            {cable.cores.filter(c => c.status === 'allocated').slice(0, 5).map(core => (
                              <div key={core.id} style={{ marginTop: '2px', color: '#1976D2' }}>
                                Core {core.core_number}: {core.client_name || 'Unknown Client'}
                              </div>
                            ))}
                            {cable.cores.filter(c => c.status === 'allocated').length > 5 && (
                              <div style={{ color: '#666', fontStyle: 'italic' }}>
                                +{cable.cores.filter(c => c.status === 'allocated').length - 5} more...
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenCoreAllocation(cable)}
                      style={{
                        marginTop: '10px',
                        padding: '6px 12px',
                        backgroundColor: '#1976D2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        width: '100%',
                      }}
                    >
                      Manage Core Allocation
                    </button>
                  </div>
                </Popup>
              </Polyline>

              {/* From Infrastructure Marker */}
              {cable.from_infrastructure && !isNaN(parseFloat(cable.from_infrastructure.latitude)) && !isNaN(parseFloat(cable.from_infrastructure.longitude)) && (
                <Marker
                  key={`from-${cable.id}`}
                  position={[parseFloat(cable.from_infrastructure.latitude), parseFloat(cable.from_infrastructure.longitude)]}
                  icon={createCustomIcon(cable.from_infrastructure)}
                >
                  <Popup>
                    <div className="map-popup" style={{ minWidth: '150px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600' }}>
                        {cable.from_infrastructure.name}
                      </h4>
                      <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                        <strong>Type:</strong> {cable.from_infrastructure.type?.name || 'N/A'}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                        <strong>Connected to:</strong> {cable.to_infrastructure?.name || 'N/A'}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '11px', color: cableColor, fontWeight: '600' }}>
                        {cable.name}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* To Infrastructure Marker */}
              {cable.to_infrastructure && cable.to_infrastructure.id !== cable.from_infrastructure?.id && !isNaN(parseFloat(cable.to_infrastructure.latitude)) && !isNaN(parseFloat(cable.to_infrastructure.longitude)) && (
                <Marker
                  key={`to-${cable.id}`}
                  position={[parseFloat(cable.to_infrastructure.latitude), parseFloat(cable.to_infrastructure.longitude)]}
                  icon={createCustomIcon(cable.to_infrastructure)}
                >
                  <Popup>
                    <div className="map-popup" style={{ minWidth: '150px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600' }}>
                        {cable.to_infrastructure.name}
                      </h4>
                      <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                        <strong>Type:</strong> {cable.to_infrastructure.type?.name || 'N/A'}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                        <strong>Connected from:</strong> {cable.from_infrastructure?.name || 'N/A'}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '11px', color: cableColor, fontWeight: '600' }}>
                        {cable.name}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {pathCoordinates.length > 0 && (
          <>
            <Polyline
              positions={pathCoordinates}
              color="#f093fb"
              weight={4}
              opacity={0.8}
            />
            {pathCoordinates.map((coord, idx) => {
              const pointColor = idx === 0 ? '#4CAF50' : idx === pathCoordinates.length - 1 ? '#f44336' : '#2196F3';
              const pointIcon = L.divIcon({
                html: `<div style="background-color:${pointColor};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,
                iconSize: [12, 12],
                className: 'path-point-marker',
              });

              return (
                <Marker
                  key={idx}
                  position={[coord[0], coord[1]]}
                  icon={pointIcon}
                />
              );
            })}
          </>
        )}
      </MapContainer>

      {isDrawing && (
        <div className="drawing-instructions">
          Click on the map to add points for the cable path. Click "Stop Drawing" when finished.
        </div>
      )}

      {/* Core Allocation Modal */}
      {showCoreModal && selectedCableForCores && (
        <CoreAllocationModal
          cable={selectedCableForCores}
          onClose={handleCloseCoreModal}
        />
      )}
    </div>
  );
};

export default CableDrawer;
