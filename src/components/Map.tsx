import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Map as MapIcon, AlertTriangle, TrendingUp } from 'lucide-react';

const CHATTANOOGA_CENTER: [number, number] = [-85.3097, 35.0456];
const INITIAL_ZOOM = 12;

interface BasemapOption {
  id: string;
  label: string;
  url: string;
}

interface CrimeData {
  region: string;
  year: number;
  violent_crime: number;
  property_crime: number;
}

const BASEMAPS: BasemapOption[] = [
  {
    id: 'positron',
    label: 'Light',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  {
    id: 'voyager',
    label: 'Detailed',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  {
    id: 'streets',
    label: 'Streets',
    url: 'https://tile.openstreetmap.org/styles/osm-bright/style.json',
  },
];

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [currentBasemap, setCurrentBasemap] = useState('positron');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [crimeData, setCrimeData] = useState<CrimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const basemap = BASEMAPS.find(b => b.id === currentBasemap) || BASEMAPS[0];

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: basemap.url,
      center: CHATTANOOGA_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: true,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const fetchCrimeData = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const apiUrl = `${supabaseUrl}/functions/v1/crime-data?region=TN`;

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch crime data: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
          const latestData = data[data.length - 1];
          setCrimeData(latestData);
        }
      } catch (err) {
        console.error('Error fetching crime data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load crime data');
      } finally {
        setLoading(false);
      }
    };

    fetchCrimeData();
  }, []);

  const handleBasemapChange = (basemapId: string) => {
    const basemap = BASEMAPS.find(b => b.id === basemapId);
    if (basemap && mapRef.current) {
      mapRef.current.setStyle(basemap.url);
      setCurrentBasemap(basemapId);
      setIsDropdownOpen(false);
    }
  };

  const currentLabel = BASEMAPS.find(b => b.id === currentBasemap)?.label || 'Light';

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 z-10">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <MapIcon size={18} className="text-gray-700" />
            <span className="text-sm font-medium text-gray-700">{currentLabel}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 min-w-40">
              {BASEMAPS.map(basemap => (
                <button
                  key={basemap.id}
                  onClick={() => handleBasemapChange(basemap.id)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    currentBasemap === basemap.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  } first:rounded-t-lg last:rounded-b-lg`}
                >
                  {basemap.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="absolute bottom-4 right-4 z-10 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-900">Error Loading Data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <div className="absolute bottom-4 right-4 z-10">
          {loading ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Loading crime data...</div>
            </div>
          ) : crimeData ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 max-w-sm">
              <div className="flex items-start gap-3">
                <TrendingUp size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900">Crime Data - {crimeData.year}</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>Violent Crimes:</span>
                      <span className="font-semibold text-red-600">{crimeData.violent_crime?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Property Crimes:</span>
                      <span className="font-semibold text-orange-600">{crimeData.property_crime?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                      Region: {crimeData.region}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
