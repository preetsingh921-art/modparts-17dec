import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom red marker for selected location
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/**
 * Inner component that handles click events on the map
 */
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

/**
 * Component to fly the map to a new center
 */
const FlyToLocation = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

/**
 * LocationPicker — interactive map for setting store location
 * Uses OpenStreetMap (free, no API key)
 *
 * @param {number} latitude - current latitude
 * @param {number} longitude - current longitude
 * @param {function} onLocationChange - callback(lat, lng, address)
 * @param {number} height - map height in px (default 350)
 */
const LocationPicker = ({ latitude, longitude, onLocationChange, height = 350 }) => {
  const defaultLat = latitude || 30.7333;   // Default: Chandigarh, India
  const defaultLng = longitude || 76.7794;
  const defaultZoom = latitude ? 15 : 5;

  const [position, setPosition] = useState(
    latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [flyTarget, setFlyTarget] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Update position when props change
  useEffect(() => {
    if (latitude && longitude) {
      const newPos = [parseFloat(latitude), parseFloat(longitude)];
      setPosition(newPos);
    }
  }, [latitude, longitude]);

  const handleLocationSelect = (lat, lng) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    setPosition([roundedLat, roundedLng]);
    setFlyTarget([roundedLat, roundedLng]);

    // Reverse geocode to get address
    reverseGeocode(roundedLat, roundedLng);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const address = data.display_name || '';
      if (onLocationChange) {
        onLocationChange(lat, lng, address);
      }
    } catch {
      if (onLocationChange) {
        onLocationChange(lat, lng, '');
      }
    }
  };

  // Search places using Nominatim (free OpenStreetMap geocoder)
  const searchPlaces = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchPlaces(value), 500);
  };

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    handleLocationSelect(lat, lng);
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
        setDetectingLocation(false);
      },
      () => {
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      {/* Search bar + Detect button */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInput}
            placeholder="🔍 Search address or place..."
            className="w-full bg-[#242424] text-[#F5F0E1] border border-[#444] rounded px-4 py-2 focus:outline-none focus:border-[#8B2332] text-sm"
          />
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#2a2a2a] border border-[#555] rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-3 py-2 text-sm text-[#F5F0E1] hover:bg-[#3a3a3a] border-b border-[#333] last:border-b-0 transition-colors"
                >
                  📍 {result.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={detectingLocation}
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
        >
          {detectingLocation ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Detecting...
            </>
          ) : (
            <>📍 My Location</>
          )}
        </button>
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border-2 border-[#444]" style={{ height: `${height}px` }}>
        <MapContainer
          center={position || [defaultLat, defaultLng]}
          zoom={defaultZoom}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          {flyTarget && <FlyToLocation center={flyTarget} zoom={16} />}
          {position && <Marker position={position} icon={redIcon} />}
        </MapContainer>
      </div>

      {/* Coordinates display */}
      {position && (
        <div className="mt-2 flex items-center gap-4 text-xs">
          <span className="text-emerald-400 font-mono">
            📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </span>
          <button
            type="button"
            onClick={() => {
              setPosition(null);
              setFlyTarget(null);
              if (onLocationChange) onLocationChange('', '', '');
            }}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            ✕ Clear
          </button>
        </div>
      )}
      <p className="text-[#666] text-xs mt-1">
        Click on the map to set your store location, or search for an address above.
      </p>
    </div>
  );
};

export default LocationPicker;
