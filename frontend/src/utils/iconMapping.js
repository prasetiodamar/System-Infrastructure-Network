import {
  Network,
  Server,
  Router,
  Flag,
  Cpu,
  GalleryThumbnails,
  Microchip,
  NotebookTabs,
  Notebook,
  Waypoints,
  Circle,
  Container,
  MapPin,
} from 'lucide-react';

// Icon mapping for infrastructure types
export const iconMapping = {
  POP: MapPin,
  'Data Center': Container,
  Kabel: Waypoints,
  'Joint Box': Microchip,
  ODC: NotebookTabs,
  ODP: Notebook,
  OTB: GalleryThumbnails,
  Tiang: Flag,
  Server: Server,
  Router: Router,
  Switch: Network,
  OLT: Cpu,
};

// Get icon component by type name
export const getIconComponent = (typeName) => {
  return iconMapping[typeName] || Circle;
};

// Get color by infrastructure type
export const getColorByType = (typeName) => {
  const colorMap = {
    POP: '#667eea',
    Kabel: '#f093fb',
    'Joint Box': '#feca57',
    ODC: '#48dbfb',
    ODP: '#ff6348',
    OTB: '#a29bfe',
    'OTB 12 Port': '#9b59b6',
    'OTB 24 Port': '#3498db',
    'OTB 48 Port': '#e67e22',
    'OTB 96 Port': '#e74c3c',
    Tiang: '#1dd1a1',
    Server: '#5f27cd',
    Router: '#00d2d3',
    Switch: '#fd79a8',
    OLT: '#00cec9',
  };
  return colorMap[typeName] || '#95a5a6';
};

// Get Leaflet marker color by type
export const getMarkerColorByType = (typeName) => {
  const markerColors = {
    POP: 'blue',
    Kabel: 'purple',
    'Joint Box': 'orange',
    ODC: 'cadetblue',
    ODP: 'red',
    OTB: 'violet',
    'OTB 12 Port': 'darkblue',
    'OTB 24 Port': 'blue',
    'OTB 48 Port': 'orange',
    'OTB 96 Port': 'red',
    Tiang: 'green',
    Server: 'darkpurple',
    Router: 'lightblue',
    Switch: 'pink',
    OLT: 'darkcyan',
  };
  return markerColors[typeName] || 'gray';
};
