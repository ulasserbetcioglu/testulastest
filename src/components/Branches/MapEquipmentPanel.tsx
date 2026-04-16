// src/components/Branches/MapEquipmentPanel.tsx
// Leaflet map panel — GPS location, mobile-first layout, equipment placement

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapPin, Satellite, Map as MapIcon, RotateCcw, Save, Layers,
  Eye, EyeOff, RotateCw, Navigation, Menu, X, CheckCircle
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Equipment {
  id: string;
  equipment_code: string;
  equipment: { name: string; type: string };
}

interface MapEquipmentPosition { lat: number; lng: number; }

interface Props {
  branchId: string;
  branchLat?: number;
  branchLng?: number;
  branchName?: string;
  equipments: Equipment[];
  mapPositions: Record<string, MapEquipmentPosition>;
  onMapPositionsChange: (positions: Record<string, MapEquipmentPosition>) => void;
  floorPlanImageUrl?: string;
  readOnly?: boolean;
}

const EQUIPMENT_COLORS: Record<string, { color: string; label: string }> = {
  kemirgen:     { color: '#ef4444', label: 'Yem İstasyonu' },
  hasere:       { color: '#3b82f6', label: 'EFK / Cihaz' },
  canli_yakalama: { color: '#f59e0b', label: 'Canlı Yakalama' },
  feromon:      { color: '#10b981', label: 'Feromonlu Tuzak' },
  default:      { color: '#6366f1', label: 'Diğer' },
};

function getEquipmentColor(type = '', code = '') {
  const t = type.toLowerCase(), c = code.toLowerCase();
  if (t.includes('kapan') || t.includes('canli') || c.includes('kapan')) return EQUIPMENT_COLORS.canli_yakalama;
  if (t.includes('yem') || t.includes('kemirgen') || t.includes('fare') || c.includes('yem')) return EQUIPMENT_COLORS.kemirgen;
  if (t.includes('efk') || t.includes('sinek') || t.includes('hasere') || c.includes('efk')) return EQUIPMENT_COLORS.hasere;
  if (t.includes('feromon') || c.includes('feromon')) return EQUIPMENT_COLORS.feromon;
  return EQUIPMENT_COLORS.default;
}

function createEquipmentIcon(L: any, color: string, code: string, isSelected: boolean) {
  const ring = isSelected
    ? `box-shadow:0 0 0 3px white,0 0 0 6px ${color};`
    : `box-shadow:0 2px 5px rgba(0,0,0,0.45);`;
  const dotSize = isSelected ? 18 : 14;
  const w = Math.max(44, code.length * 8 + 12);
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;">
      <div style="background:${color};border:2.5px solid white;border-radius:50%;
        width:${dotSize}px;height:${dotSize}px;${ring}"></div>
      <span style="background:rgba(20,20,20,0.83);color:white;font-size:10.5px;font-weight:700;
        font-family:Arial,sans-serif;padding:1px 5px;border-radius:4px;white-space:nowrap;
        letter-spacing:0.2px;line-height:1.5;">${code}</span>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [w, 36], iconAnchor: [w / 2, 8] });
}

function createGpsIcon(L: any) {
  const html = `<div style="background:#2563eb;border:3px solid white;border-radius:50%;
    width:16px;height:16px;box-shadow:0 0 0 4px rgba(37,99,235,0.35),0 2px 6px rgba(0,0,0,0.4);"></div>`;
  return L.divIcon({ html, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
}

const MapEquipmentPanel: React.FC<Props> = ({
  branchId: _branchId, branchLat, branchLng, branchName,
  equipments, mapPositions, onMapPositionsChange, floorPlanImageUrl,
  readOnly = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<any>(null);
  const markersRef      = useRef<Record<string, any>>({});
  const tileLayerRef    = useRef<any>(null);
  const overlayRef      = useRef<any>(null);
  const gpsMarkerRef    = useRef<any>(null);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [placingMode,  setPlacingMode]  = useState(false);
  const [tileType,     setTileType]     = useState<'satellite' | 'streets'>('satellite');
  const [L,            setL]            = useState<any>(null);
  const [mapReady,     setMapReady]     = useState(false);
  const [localPositions, setLocalPositions] = useState<Record<string, MapEquipmentPosition>>(mapPositions);
  const [sidebarOpen,  setSidebarOpen]  = useState(false); // mobile: hidden by default
  const [gpsStatus,    setGpsStatus]    = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  // kroki overlay
  const [showKroki,   setShowKroki]   = useState(false);
  const [krokiOpacity, setKrokiOpacity] = useState(0.45);
  const [krokiRotation, setKrokiRotation] = useState(0);

  const defaultLat = branchLat || 41.0082;
  const defaultLng = branchLng || 28.9784;
  const hasKroki = !!floorPlanImageUrl;

  // Load Leaflet
  useEffect(() => {
    import('leaflet').then(mod => {
      const Lx = mod.default;
      delete (Lx.Icon.Default.prototype as any)._getIconUrl;
      Lx.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setL(Lx);
    });
  }, []);

  // Init map
  useEffect(() => {
    if (!L || !mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng], zoom: 18,
      zoomControl: true, tap: true, // enable tap for mobile
    });
    const tile = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri', maxZoom: 22 }
    );
    tile.addTo(map);
    tileLayerRef.current = tile;

    // Branch center indicator
    const centerIcon = L.divIcon({
      html: `<div style="background:#1d4ed8;border:3px solid white;border-radius:50%;width:12px;height:12px;box-shadow:0 0 0 2px #1d4ed8;"></div>`,
      className: '', iconSize: [12, 12], iconAnchor: [6, 6],
    });
    L.marker([defaultLat, defaultLng], { icon: centerIcon, zIndexOffset: 2000 })
      .addTo(map).bindPopup(`<strong>${branchName || 'Şube'}</strong>`);

    mapInstanceRef.current = map;
    setMapReady(true);
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [L]);

  // Tile toggle
  useEffect(() => {
    if (!mapInstanceRef.current || !L || !mapReady) return;
    if (tileLayerRef.current) mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const url = tileType === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    tileLayerRef.current = L.tileLayer(url, {
      attribution: tileType === 'satellite' ? '© Esri' : '© OSM', maxZoom: 22,
    }).addTo(mapInstanceRef.current);
  }, [tileType, mapReady]);

  // Kroki overlay
  useEffect(() => {
    if (!mapInstanceRef.current || !L || !mapReady || !floorPlanImageUrl) return;
    if (overlayRef.current) { mapInstanceRef.current.removeLayer(overlayRef.current); overlayRef.current = null; }
    if (!showKroki) return;
    const HALF = 0.001;
    const bounds: [[number, number], [number, number]] = [
      [defaultLat - HALF, defaultLng - HALF],
      [defaultLat + HALF, defaultLng + HALF],
    ];
    const ov = L.imageOverlay(floorPlanImageUrl, bounds, { opacity: krokiOpacity, interactive: false });
    ov.addTo(mapInstanceRef.current);
    overlayRef.current = ov;
    const el = ov.getElement?.() as HTMLElement | null;
    if (el) { el.style.transform = `rotate(${krokiRotation}deg)`; el.style.transformOrigin = 'center center'; }
  }, [showKroki, mapReady, floorPlanImageUrl]);

  useEffect(() => {
    if (!overlayRef.current) return;
    overlayRef.current.setOpacity(krokiOpacity);
    const el = overlayRef.current.getElement?.() as HTMLElement | null;
    if (el) el.style.transform = `rotate(${krokiRotation}deg)`;
  }, [krokiOpacity, krokiRotation]);

  // Sync equipment markers
  const syncMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !L) return;
    const map = mapInstanceRef.current;
    Object.values(markersRef.current).forEach((m: any) => map.removeLayer(m));
    markersRef.current = {};
    equipments.forEach(eq => {
      const pos = localPositions[eq.id];
      if (!pos) return;
      const col = getEquipmentColor(eq.equipment?.type, eq.equipment_code);
      const icon = createEquipmentIcon(L, col.color, eq.equipment_code, selectedEquipmentId === eq.id);
      const m = L.marker([pos.lat, pos.lng], { icon, draggable: true }).addTo(map)
        .bindTooltip(`${eq.equipment_code}`, { permanent: false, direction: 'top', offset: [0, -10] });
      m.on('dragend', () => {
        const ll = m.getLatLng();
        setLocalPositions(prev => ({ ...prev, [eq.id]: { lat: ll.lat, lng: ll.lng } }));
      });
      m.on('click', () => setSelectedEquipmentId(eq.id));
      markersRef.current[eq.id] = m;
    });
  }, [L, localPositions, equipments, selectedEquipmentId]);

  useEffect(() => { if (mapReady) syncMarkers(); }, [syncMarkers, mapReady]);

  // Click-to-place
  useEffect(() => {
    if (!mapInstanceRef.current || !placingMode || !selectedEquipmentId) return;
    const map = mapInstanceRef.current;
    const handler = (e: any) => {
      setLocalPositions(prev => {
        const next = { ...prev, [selectedEquipmentId!]: { lat: e.latlng.lat, lng: e.latlng.lng } };
        const idx = equipments.findIndex(eq => eq.id === selectedEquipmentId);
        const nxt = equipments.find((eq, i) => i > idx && !next[eq.id]);
        setSelectedEquipmentId(nxt?.id || null);
        if (!nxt) setPlacingMode(false);
        return next;
      });
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [placingMode, selectedEquipmentId, equipments]);

  // Cursor
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.getContainer().style.cursor = (placingMode && selectedEquipmentId) ? 'crosshair' : '';
  }, [placingMode, selectedEquipmentId]);

  // ─── GPS ────────────────────────────────────────────────────────────────────
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) { alert('Tarayıcınız konum erişimini desteklemiyor.'); return; }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!mapInstanceRef.current || !L) return;
        const map = mapInstanceRef.current;
        // Fly to GPS location
        map.flyTo([lat, lng], 19, { duration: 1 });
        // Add/update GPS marker
        if (gpsMarkerRef.current) map.removeLayer(gpsMarkerRef.current);
        const icon = createGpsIcon(L);
        gpsMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 3000 })
          .addTo(map)
          .bindPopup(`📍 Mevcut Konum<br>Doğruluk: ±${Math.round(accuracy)}m`)
          .openPopup();
        // Optional accuracy circle
        L.circle([lat, lng], { radius: accuracy, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.1, weight: 1 })
          .addTo(map);
        setGpsStatus('ok');
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsStatus('error');
        alert('Konum alınamadı: ' + (err.code === 1
          ? 'Konum izni reddedildi. Tarayıcı ayarlarından izin verin.'
          : err.message));
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };
  // ────────────────────────────────────────────────────────────────────────────

  const handleReset = (id: string) => setLocalPositions(prev => { const c = { ...prev }; delete c[id]; return c; });
  const placedCount = equipments.filter(eq => localPositions[eq.id]).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-100">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between bg-white border-b px-3 py-2 shadow-sm flex-shrink-0 gap-2 flex-wrap">
        {/* Left: title + count */}
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 md:hidden"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <MapPin size={16} className="text-blue-600 hidden sm:block" />
          <span className="font-bold text-sm text-gray-800 hidden sm:block">Harita Yerleşimi</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {placedCount}/{equipments.length}
          </span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* GPS */}
          <button
            onClick={handleGetMyLocation}
            disabled={gpsStatus === 'loading'}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              gpsStatus === 'ok'
                ? 'bg-green-600 text-white border-green-600'
                : gpsStatus === 'error'
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title="Cihazın GPS konumunu al"
          >
            {gpsStatus === 'loading'
              ? <span className="animate-pulse text-xs">📡</span>
              : gpsStatus === 'ok'
                ? <CheckCircle size={13} />
                : <Navigation size={13} />}
            <span className="hidden sm:inline">
              {gpsStatus === 'loading' ? 'Aranıyor...' : gpsStatus === 'ok' ? 'Konum Alındı' : 'Konumumu Al'}
            </span>
          </button>

          {/* Tile toggle */}
          <button
            onClick={() => setTileType(t => t === 'satellite' ? 'streets' : 'satellite')}
            className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            {tileType === 'satellite' ? <MapIcon size={13} /> : <Satellite size={13} />}
            <span className="hidden sm:inline">{tileType === 'satellite' ? 'Sokak' : 'Uydu'}</span>
          </button>

          {/* Save */}
          {!readOnly && (
            <button
              onClick={() => onMapPositionsChange(localPositions)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
            >
              <Save size={13} />
              <span className="hidden sm:inline">Kaydet</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Kroki toolbar ── */}
      {hasKroki && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border-b border-amber-100 flex-shrink-0 flex-wrap text-xs">
          <span className="font-bold text-amber-700 flex items-center gap-1"><Layers size={11} /> Kroki</span>
          <button
            onClick={() => setShowKroki(v => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded border font-medium ${showKroki
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-gray-600 border-gray-300'}`}
          >
            {showKroki ? <Eye size={11} /> : <EyeOff size={11} />}
            {showKroki ? 'Gizle' : 'Göster'}
          </button>
          {showKroki && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Opaklık:</span>
                <input type="range" min={5} max={95} step={5}
                  value={Math.round(krokiOpacity * 100)}
                  onChange={e => setKrokiOpacity(+e.target.value / 100)}
                  className="w-16 accent-amber-500" />
                <span className="text-gray-500 w-6">{Math.round(krokiOpacity * 100)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setKrokiRotation(r => (r - 5 + 360) % 360)} className="p-1 rounded hover:bg-amber-100"><RotateCcw size={12} /></button>
                <input type="range" min={0} max={359} value={krokiRotation}
                  onChange={e => setKrokiRotation(+e.target.value)}
                  className="w-16 accent-amber-500" />
                <button onClick={() => setKrokiRotation(r => (r + 5) % 360)} className="p-1 rounded hover:bg-amber-100"><RotateCw size={12} /></button>
                <span className="text-gray-500 w-7">{krokiRotation}°</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Main Area ── */}
      <div className="flex flex-col-reverse md:flex-row flex-1 min-h-0 overflow-hidden relative">

        {/* Sidebar — mobile: bottom horizontal list, desktop: left fixed column */}
        <div className="bg-white border-t md:border-t-0 md:border-r flex flex-col min-h-0 transition-all duration-200 flex-shrink-0 w-full md:w-48 z-[500]">
          {/* Place button */}
          {!readOnly && (
            <div className="p-2 border-b flex-shrink-0">
              <button
                onClick={() => {
                  if (!placingMode) {
                  const first = equipments.find(eq => !localPositions[eq.id]);
                  setSelectedEquipmentId(first?.id || equipments[0]?.id || null);
                  setPlacingMode(true);
                } else {
                    setPlacingMode(false);
                  }
                }}
                className={`w-full py-2 text-xs font-bold rounded-lg transition-all ${placingMode
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-purple-600 text-white hover:bg-purple-700'}`}
              >
                {placingMode ? '⛔ İptal' : '📍 Ekipman Yerleştir'}
              </button>
              {placingMode && selectedEquipmentId && (
                <p className="text-[10px] text-purple-600 mt-1 text-center font-medium">
                  ↗ Haritada tıkla: <span className="font-bold">{equipments.find(e => e.id === selectedEquipmentId)?.equipment_code}</span>
                </p>
              )}
            </div>
          )}

          {/* Equipment list */}
          <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto p-1.5 gap-2 md:space-y-0.5">
            {equipments.length === 0 && <p className="text-center text-xs text-gray-400 p-4">Ekipman yok</p>}
            {equipments.map(eq => {
              const col = getEquipmentColor(eq.equipment?.type, eq.equipment_code);
              const isPlaced   = !!localPositions[eq.id];
              const isSelected = selectedEquipmentId === eq.id;
              return (
                <div key={eq.id}
                  onClick={() => {
                    setSelectedEquipmentId(eq.id);
                    if (!placingMode) {
                      const pos = localPositions[eq.id];
                      if (pos && mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([pos.lat, pos.lng], 20, { duration: 0.6 });
                      }
                    }
                  }}
                  className={`flex flex-row md:flex-row items-center justify-between gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all border text-xs flex-shrink-0 min-w-[110px] md:min-w-0 ${
                    isSelected ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: col.color }} />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate text-[11px]">{eq.equipment_code}</p>
                      <p className="text-gray-400 truncate text-[9px]">{eq.equipment?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {isPlaced
                      ? <><span className="text-green-500 text-xs">✓</span>
                          {!readOnly && (
                            <button onClick={e => { e.stopPropagation(); handleReset(eq.id); }}
                              className="text-red-400 hover:text-red-600 p-0.5"><RotateCcw size={10} /></button>
                          )}</>
                      : <span className="text-gray-300 text-xs">○</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend - hidden on mobile to save space */}
          <div className="hidden md:block p-2 border-t bg-gray-50 flex-shrink-0">
            {Object.values(EQUIPMENT_COLORS).map(v => (
              <div key={v.label} className="flex items-center gap-1.5 mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} />
                <span className="text-[9px] text-gray-500">{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative min-h-0">
          {placingMode && selectedEquipmentId && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1001] bg-purple-700 text-white text-xs px-3 py-1.5 rounded-full shadow font-medium pointer-events-none">
              📍 Haritaya tıkla → <strong>{equipments.find(e => e.id === selectedEquipmentId)?.equipment_code}</strong>
            </div>
          )}
          {!branchLat && (
            <div className="absolute top-2 right-2 z-[1001] bg-amber-500 text-white text-[10px] px-2 py-1 rounded-full shadow font-medium pointer-events-none">
              ⚠ Koordinat yok
            </div>
          )}

          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );
};

export default MapEquipmentPanel;
