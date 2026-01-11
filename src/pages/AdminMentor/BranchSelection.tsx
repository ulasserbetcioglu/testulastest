import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, TextInput } from 'react-native';
// WEB NAVİGASYON:
import { useNavigate } from 'react-router-dom'; 
import { ArrowLeft, Search, MapPin, ChevronRight, Building2 } from 'lucide-react-native';

// Örnek Veri (Gerçek veri Supabase'den çekilebilir)
const MOCK_BRANCHES = [
  { id: '1', name: 'Merkez Şube', city: 'İstanbul', district: 'Kadıköy', address: 'Bağdat Cad. No:1' },
  { id: '2', name: 'Anadolu Yakası Depo', city: 'İstanbul', district: 'Ümraniye', address: 'Sanayi Mah. 2. Sok.' },
  { id: '3', name: 'Avrupa Yakası Ofis', city: 'İstanbul', district: 'Beşiktaş', address: 'Barbaros Bulvarı' },
  { id: '4', name: 'Bursa Bölge', city: 'Bursa', district: 'Nilüfer', address: 'Odunluk Mah.' },
  { id: '5', name: 'İzmir Şube', city: 'İzmir', district: 'Bornova', address: 'Kazım Dirik Mah.' },
];

const BranchSelection = () => {
  // Navigation ve Route parametrelerini sildik, yerine hook kullanıyoruz:
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState(MOCK_BRANCHES);

  const handleBranchSelect = (branch: any) => {
    console.log('Seçilen Şube:', branch);
    // Şube seçildikten sonra bir sonraki adıma (örn: Denetim Menüsü) yönlendir
    // State taşımak için state parametresi kullanılabilir
    navigate('/admin/mentor/audit-menu', { state: { selectedBranch: branch } });
  };

  const filterBranches = (text: string) => {
    setSearchQuery(text);
    const filtered = MOCK_BRANCHES.filter(item => 
      item.name.toLowerCase().includes(text.toLowerCase()) ||
      item.city.toLowerCase().includes(text.toLowerCase())
    );
    setBranches(filtered);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleBranchSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconBox}>
        <Building2 size={24} color="#3B82F6" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.branchName}>{item.name}</Text>
        <View style={styles.locationRow}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.locationText}>{item.district}, {item.city}</Text>
        </View>
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate(-1)} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Şube Seçimi</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şube veya şehir ara..."
            value={searchQuery}
            onChangeText={filterBranches}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={branches}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Şube bulunamadı.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', minHeight: '100vh' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  searchContainer: { padding: 16, backgroundColor: '#fff' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#111827', outlineStyle: 'none' }, // web için outlineStyle
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    cursor: 'pointer' // Web için
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: { flex: 1 },
  branchName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 14, color: '#6B7280', marginLeft: 4 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 16 },
});

export default BranchSelection;