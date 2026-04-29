import { useState, useEffect } from 'react';

/**
 * Custom hook to detect visitor's country via Geo-IP.
 * Caches the result in localStorage to avoid repeated API calls.
 * Falls back gracefully if detection fails (returns null = show all stock).
 * 
 * Usage: const { country, countryCode, loading } = useGeoLocation();
 */
const CACHE_KEY = 'modparts_geo_country';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useGeoLocation() {
  const [geoData, setGeoData] = useState({ country: null, countryCode: null, loading: true });

  useEffect(() => {
    // Check cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          setGeoData({ country: parsed.country, countryCode: parsed.countryCode, loading: false });
          return;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }

    // Fetch from free Geo-IP API
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/', { 
          signal: AbortSignal.timeout(3000) // 3s timeout
        });
        if (response.ok) {
          const data = await response.json();
          const result = {
            country: data.country_name || null,
            countryCode: data.country_code || null, // 'IN', 'CA', 'US', etc.
            timestamp: Date.now()
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(result));
          setGeoData({ country: result.country, countryCode: result.countryCode, loading: false });
        } else {
          setGeoData(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.log('Geo-IP detection skipped (offline or blocked)');
        setGeoData(prev => ({ ...prev, loading: false }));
      }
    };

    detectCountry();
  }, []);

  return geoData;
}

/**
 * Returns a country flag emoji for a warehouse country code.
 * @param {string} countryCode - 'IND', 'CAN', 'US', etc.
 */
export function getWarehouseFlag(countryCode) {
  if (!countryCode) return '🏭';
  const flags = {
    'IND': '🇮🇳',
    'IN': '🇮🇳',
    'CAN': '🇨🇦',
    'CA': '🇨🇦',
    'US': '🇺🇸',
    'UK': '🇬🇧',
    'GB': '🇬🇧',
  };
  return flags[countryCode.toUpperCase()] || '🌍';
}
