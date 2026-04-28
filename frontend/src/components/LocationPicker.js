import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import './LocationPicker.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });
  return position === null ? null : (
    <Marker position={[position.lat, position.lng]}>
      <Popup>
        Latitude: {position.lat.toFixed(6)}<br />
        Longitude: {position.lng.toFixed(6)}
      </Popup>
    </Marker>
  );
};

const LocationPicker = ({ latitude, longitude, onLocationSelect, onClose }) => {
  const [position, setPosition] = useState(
    latitude && longitude
      ? { lat: parseFloat(latitude), lng: parseFloat(longitude) }
      : null
  );
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);

  const defaultCenter = [-6.2088, 106.8456]; // Jakarta

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const newPos = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };
        setPosition(newPos);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    if (position) {
      onLocationSelect({
        latitude: position.lat.toString(),
        longitude: position.lng.toString(),
      });
      onClose();
    }
  };

  return (
    <div className="location-picker-overlay">
      <div className="location-picker-modal">
        <div className="location-picker-header">
          <h3>Pilih Lokasi di Map</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="location-picker-search">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Cari lokasi (nama kota, alamat, dll)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        <div className="location-picker-map">
          <MapContainer
            center={position ? [position.lat, position.lng] : defaultCenter}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
        </div>

        <div className="location-picker-info">
          {position ? (
            <div>
              <p><strong>Latitude:</strong> {position.lat.toFixed(6)}</p>
              <p><strong>Longitude:</strong> {position.lng.toFixed(6)}</p>
            </div>
          ) : (
            <p className="no-selection">Klik pada map untuk memilih lokasi</p>
          )}
        </div>

        <div className="location-picker-actions">
          <button
            className="btn-cancel"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!position}
          >
            Pilih Lokasi
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
