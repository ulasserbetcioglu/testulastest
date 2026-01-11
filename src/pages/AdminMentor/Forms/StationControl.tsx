import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Modal, Alert } from 'react-native';
import { ArrowLeft, ScanLine, CheckCircle2, XCircle, AlertTriangle, MousePointer2, Save, Filter } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: {
    params: {
      customerName: string;
      branchName: string;
    }
  };
}

// İstasyon Veri Yapısı
interface Station {
  id: string;
  code: string;       // Örn: K-01 (Kemirgen 1)
  type: 'rodent' | 'insect' | 'lft'; // Kemirgen, Yürüyen, Sinek Tutucu
  location: string;   // Örn: Mutfak Kapı Arkası
  status: 'pending' | 'checked';
  condition: 'intact' | 'broken' | 'missing'; // Sağlam, Kırık, Kayıp
  activity: boolean;  // Aktivite var mı?
  baitStatus: 'full' | 'partial' | 'empty' | 'moldy'; // Yem durumu
}

const StationControl: React.FC<Props> = ({ navigation, route }) => {
  const { customerName, branchName } = route.params || { customerName: '', branchName: '' };

  // Örnek İstasyon Listesi (Normalde veritabanından gelir)
  const [stations, setStations] = useState<Station[]>([
    { id: '1', code: 'K-01', type: 'rodent', location: 'Ana Giriş Sol', status: 'pending', condition: 'intact', activity: false, baitStatus: 'full' },
    { id: '2', code: 'K-02', type: 'rodent', location: 'Ana Giriş Sağ', status: 'pending', condition: 'intact', activity: false, baitStatus: 'full' },
    { id: '3', code: 'K-03', type: 'rodent', location: 'Depo Kapısı', status: 'pending', condition: 'intact', activity: false, baitStatus: 'full' },
    { id: '4', code: 'Y-01', type: 'insect', location: 'Mutfak Tezgâh Altı', status: 'pending', condition: 'intact', activity: false, baitStatus: 'full' },
    { id: '5', code: 'L-01', type: 'lft', location: 'Üretim Girişi', status: 'pending', condition: 'intact', activity: false, baitStatus: 'full' },
  ]);

  // Modal State
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filtreleme (Sadece kontrol edilmeyenler vs.)
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const openStationModal = (station: Station) => {
    setSelectedStation({ ...station }); // Kopyasını al
    setModalVisible(true);
  };

  const saveStationData = () => {
    if (selectedStation) {
      const updatedStations = stations.map(s => 
        s.id === selectedStation.id 
          ? { ...selectedStation, status: 'checked' as const } 
          : s
      );
      setStations(updatedStations);
      setModalVisible(false);
    }
  };

  const handleFinishControl = () => {
    const pendingCount = stations.filter(s => s.status === 'pending').length;
    if (pendingCount > 0) {
      Alert.alert(
        "Kontrol Bitmedi",
        `${pendingCount} adet istasyon kontrol edilmedi. Yine de bitirmek istiyor musunuz?`,
        [
          { text: "Hayır", style: "cancel" },
          { text: "Evet, Bitir", onPress: () => navigation.goBack() }
        ]
      );
    } else {
      Alert.alert("Başarılı", "Tüm istasyonlar kontrol edildi.", [{ text: "Tamam", onPress: () => navigation.goBack() }]);
    }
  };

  // --- Render Yardımcıları ---

  const getStatusColor = (station: Station) => {
    if (station.status === 'pending') return '#E2E8F0'; // Gri
    if (station.activity) return '#EF4444'; // Kırmızı (Aktivite Var!)
    if (station.condition !== 'intact') return '#F59E0B'; // Turuncu (Sorunlu)
    return '#22C55E'; // Yeşil (Temiz)
  };

  const renderItem = ({ item }: { item: Station }) => (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: getStatusColor(item), borderLeftWidth: 6 }]}
      onPress={() => openStationModal(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardCode}>{item.code}</Text>
        <Text style={styles.cardType}>
          {item.type === 'rodent' ? 'Kemirgen' : item.type === 'insect' ? 'Yürüyen' : 'EFC Cihazı'}
        </Text>
      </View>
      
      <Text style={styles.cardLocation}>{item.location}</Text>
      
      <View style={styles.cardFooter}>
        {item.status === 'checked' ? (
          <View style={styles.statusBadge}>
            {item.activity ? (
              <View style={[styles.badge, { backgroundColor: '#FEF2F2' }]}>
                <AlertTriangle size={12} color="#EF4444" />
                <Text style={[styles.badgeText, { color: '#EF4444' }]}>Aktivite</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: '#F0FDF4' }]}>
                <CheckCircle2 size={12} color="#22C55E" />
                <Text style={[styles.badgeText, { color: '#22C55E' }]}>Temiz</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.pendingText}>Kontrol Bekliyor...</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>İstasyon Takip</Text>
          <Text style={styles.headerSubtitle}>{branchName}</Text>
        </View>
        
        {/* Simüle Edilmiş QR Butonu */}
        <TouchableOpacity style={styles.qrButton} onPress={() => Alert.alert('Kamera', 'QR Kod tarayıcı açılıyor...')}>
          <ScanLine size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* İstatistik & Filtre */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Toplam: {stations.length} | Kontrol: {stations.filter(s => s.status === 'checked').length}
        </Text>
        <TouchableOpacity onPress={() => setShowOnlyPending(!showOnlyPending)}>
          <Filter size={20} color={showOnlyPending ? "#3B82F6" : "#94A3B8"} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={showOnlyPending ? stations.filter(s => s.status === 'pending') : stations}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        numColumns={2} // Grid görünümü
      />

      {/* Bitir Butonu */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinishControl}>
          <Save size={20} color="#fff" />
          <Text style={styles.finishButtonText}>Kontrolü Tamamla</Text>
        </TouchableOpacity>
      </View>

      {/* --- DETAY MODALI --- */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedStation?.code} - Durum Girişi</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <XCircle size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {selectedStation && (
              <View style={styles.formContent}>
                
                {/* 1. Soru: İstasyon Sağlamlığı */}
                <Text style={styles.questionLabel}>İstasyon Durumu</Text>
                <View style={styles.optionRow}>
                  {['intact', 'broken', 'missing'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.optionButton,
                        selectedStation.condition === opt && styles.optionSelected
                      ]}
                      onPress={() => setSelectedStation({...selectedStation, condition: opt as any})}
                    >
                      <Text style={[
                        styles.optionText, 
                        selectedStation.condition === opt && styles.optionTextSelected
                      ]}>
                        {opt === 'intact' ? 'Sağlam' : opt === 'broken' ? 'Kırık' : 'Kayıp'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 2. Soru: Aktivite Var mı? */}
                <Text style={styles.questionLabel}>Aktivite Durumu</Text>
                <TouchableOpacity
                  style={[
                    styles.activityButton,
                    selectedStation.activity ? styles.activityActive : styles.activityInactive
                  ]}
                  onPress={() => setSelectedStation({...selectedStation, activity: !selectedStation.activity})}
                >
                  <AlertTriangle size={24} color={selectedStation.activity ? "#fff" : "#64748B"} />
                  <Text style={[
                    styles.activityButtonText,
                    selectedStation.activity && { color: '#fff' }
                  ]}>
                    {selectedStation.activity ? 'Aktivite TESPİT EDİLDİ!' : 'Aktivite Yok (Temiz)'}
                  </Text>
                </TouchableOpacity>

                {/* 3. Soru: Yem Durumu */}
                <Text style={styles.questionLabel}>Yem / Yapışkan Durumu</Text>
                <View style={styles.gridOptions}>
                  {[
                    { key: 'full', label: 'Tam / Temiz' },
                    { key: 'partial', label: 'Kısmen Yenmiş' },
                    { key: 'empty', label: 'Tüketilmiş' },
                    { key: 'moldy', label: 'Küflü / Bozuk' }
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.gridButton,
                        selectedStation.baitStatus === opt.key && styles.optionSelected
                      ]}
                      onPress={() => setSelectedStation({...selectedStation, baitStatus: opt.key as any})}
                    >
                      <Text style={[
                        styles.optionText,
                        selectedStation.baitStatus === opt.key && styles.optionTextSelected
                      ]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Kaydet Butonu */}
                <TouchableOpacity style={styles.modalSaveButton} onPress={saveStationData}>
                  <Text style={styles.modalSaveText}>Kaydet ve Kapat</Text>
                </TouchableOpacity>

              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  qrButton: {
    padding: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
  },
  statsText: {
    color: '#1E40AF',
    fontWeight: '600',
    fontSize: 13,
  },
  listContent: {
    padding: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 6,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 110,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  cardType: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardLocation: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
    height: 36, // 2 satır için
  },
  cardFooter: {
    marginTop: 'auto',
  },
  statusBadge: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  pendingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  finishButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  formContent: {
    gap: 16,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  optionText: {
    color: '#64748B',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  activityInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  activityActive: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  activityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#64748B',
  },
  gridOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridButton: {
    width: '48%', // 2 kolon
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSaveButton: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StationControl;