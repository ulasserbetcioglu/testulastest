import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, Loader2 as Loader, Globe, Phone, MapPin, Building, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx'; // Excel için import eklendi

// Google Haritalar API anahtarınızı buraya ekleyin
const GOOGLE_MAPS_API_KEY = "AIzaSyBakigooZV4gApre4wcnNnszhLXkHEmsd4"; // <-- Kendi API anahtarınızla değiştirin

// Arayüz tanımları
interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: google.maps.places.PlaceGeometry | undefined;
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
}

const IsletmeKesif = () => {
  // State'ler
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [searchQuery, setSearchQuery] = useState('Bursa otel');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // Referanslar
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const activeMarkerRef = useRef<google.maps.Marker | null>(null);

  // Google Haritalar script'ini yükle
  useEffect(() => {
    const scriptId = 'googleMapsScript';
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    }
  }, []);

  // Haritayı ve Places servisini başlat
  const initMap = useCallback(() => {
    if (map || !mapContainerRef.current) return;

    const bursaCoords = { lat: 40.1885, lng: 29.0609 };
    const newMap = new window.google.maps.Map(mapContainerRef.current, {
      center: bursaCoords,
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
    });

    setMap(newMap);
    setPlacesService(new window.google.maps.places.PlacesService(newMap));
  }, [map]);
  
  // Arama yapıldığında
  const handleSearch = () => {
    if (!placesService || !map || !searchQuery) return;

    setLoadingSearch(true);
    setSelectedPlace(null);
    clearMarkers();

    const request: google.maps.places.TextSearchRequest = {
      query: searchQuery,
      location: map.getCenter(),
      radius: 5000, // 5km yarıçap
    };

    placesService.textSearch(request, (results, status) => {
      setLoadingSearch(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setPlaces(results as PlaceResult[]);
        createMarkersForPlaces(results as PlaceResult[]);
        toast.success(`${results.length} işletme bulundu!`);
      } else {
        setPlaces([]);
        toast.error("Arama sonucu bulunamadı veya bir hata oluştu.");
      }
    });
  };

  // İşaretçileri temizle
  const clearMarkers = () => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
    if (activeMarkerRef.current) {
      activeMarkerRef.current.setAnimation(null);
      activeMarkerRef.current = null;
    }
  };
  
  // İşletmeler için haritada işaretçi oluştur
  const createMarkersForPlaces = (placesData: PlaceResult[]) => {
    if (!map) return;
    const bounds = new window.google.maps.LatLngBounds();
    const newMarkers = placesData.map(place => {
      if (!place.geometry || !place.geometry.location) return null;
      const marker = new window.google.maps.Marker({
        map,
        position: place.geometry.location,
        title: place.name,
      });
      bounds.extend(place.geometry.location);
      marker.addListener('click', () => {
        handlePlaceSelect(place);
      });
      return marker;
    }).filter((marker): marker is google.maps.Marker => marker !== null);

    setMarkers(newMarkers);
    map.fitBounds(bounds);
  };

  // Bir işletme seçildiğinde detaylarını getir
  const handlePlaceSelect = (place: PlaceResult) => {
    if (!placesService || !map) return;

    setLoadingDetails(true);
    if (activeMarkerRef.current) {
      activeMarkerRef.current.setAnimation(null);
    }

    const request = {
      placeId: place.place_id,
      fields: ['name', 'formatted_address', 'formatted_phone_number', 'website'],
    };

    placesService.getDetails(request, (details, status) => {
      setLoadingDetails(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
        setSelectedPlace(details as PlaceDetails);
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
          const targetMarker = markers.find(m => m.getTitle() === place.name);
          if (targetMarker) {
            targetMarker.setAnimation(window.google.maps.Animation.BOUNCE);
            activeMarkerRef.current = targetMarker;
          }
        }
      } else {
        toast.error("İşletme detayları alınamadı.");
      }
    });
  };

  // YENİ FONKSİYON: Excel'e aktarma
  const handleExportExcel = () => {
    if (places.length === 0) {
      toast.info("Dışa aktarılacak bir işletme bulunmuyor.");
      return;
    }

    // Excel için veriyi formatla
    const dataToExport = places.map(place => ({
      "İşletme Adı": place.name,
      "Adres": place.vicinity,
    }));

    // Çalışma sayfası oluştur
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    // Yeni bir çalışma kitabı oluştur
    const workbook = XLSX.utils.book_new();
    // Sayfayı kitaba ekle
    XLSX.utils.book_append_sheet(workbook, worksheet, "İşletmeler");

    // Sütun genişliklerini ayarla
    worksheet["!cols"] = [{ wch: 40 }, { wch: 60 }];

    // Dosyayı indir
    XLSX.writeFile(workbook, "isletme_listesi.xlsx");

    toast.success("İşletme listesi başarıyla Excel'e aktarıldı!");
  };
  

  return (
    <div className="flex h-screen w-screen p-4 gap-4 bg-gray-100 overflow-hidden">
      {/* Sol Panel: Arama, Liste ve Detaylar */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white rounded-xl shadow-lg flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">İşletme Keşfi</h2>
          <p className="text-sm text-gray-500">Potansiyel müşterileri haritada bulun.</p>
        </div>
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="örn: Bursa'daki tekstil firmaları"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleSearch} disabled={loadingSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
              {loadingSearch ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto px-2 pb-4 space-y-1">
          {/* Seçili İşletme Detayı */}
          {loadingDetails ? (
            <div className="p-4 text-center text-gray-500">Detaylar yükleniyor...</div>
          ) : selectedPlace ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg m-2">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Building size={20}/> {selectedPlace.name}</h3>
              <div className="space-y-2 mt-3 text-sm">
                <p className="flex items-start gap-2 text-gray-700"><MapPin size={16} className="mt-0.5 flex-shrink-0" /> {selectedPlace.formatted_address}</p>
                {selectedPlace.formatted_phone_number && <p className="flex items-center gap-2 text-gray-700"><Phone size={16} /> {selectedPlace.formatted_phone_number}</p>}
                {selectedPlace.website && <p className="flex items-center gap-2"><Globe size={16} /><a href={selectedPlace.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">Web Sitesini Ziyaret Et</a></p>}
              </div>
            </div>
          ) : null}

          {/* Arama Sonuçları Başlığı ve Excel Butonu */}
          <div className="flex justify-between items-center px-2 pt-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Arama Sonuçları</h4>
            <button 
              onClick={handleExportExcel}
              disabled={places.length === 0}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
              title="Excel'e Aktar"
            >
              <FileDown size={14} />
              Aktar
            </button>
          </div>

          {places.map(place => (
            <div
              key={place.place_id}
              onClick={() => handlePlaceSelect(place)}
              className="p-3 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors"
            >
              <p className="font-semibold text-gray-800">{place.name}</p>
              <p className="text-xs text-gray-500">{place.vicinity}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sağ Panel: Harita */}
      <div className="w-full md:w-2/3 lg:w-3/4 bg-white rounded-xl shadow-lg flex flex-col h-full">
        <div ref={mapContainerRef} className="w-full h-full rounded-xl" />
      </div>
    </div>
  );
};

export default IsletmeKesif;
