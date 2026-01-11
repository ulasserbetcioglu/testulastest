import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, SafeAreaView, StatusBar, ListRenderItem } from 'react-native';
import { Search, Building2, ChevronRight, ArrowLeft, MapPin } from 'lucide-react-native';

interface Props {
  navigation: any;
}

// Müşteri verisi için Interface
interface Customer {
  id: string;
  name: string;
  sector: string;
  city: string;
}

const CustomerSelection: React.FC<Props> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const customers: Customer[] = [
    { id: '1', name: 'Lezzet Gıda Üretim A.Ş.', sector: 'Gıda Fabrikası', city: 'Bursa' },
    { id: '2', name: 'Grand Hotel Plaza', sector: 'Otelcilik', city: 'İstanbul' },
    { id: '3', name: 'Organik Tarım Depoları', sector: 'Depolama', city: 'İzmir' },
    { id: '4', name: 'Mega AVM Yönetimi', sector: 'AVM', city: 'Ankara' },
    { id: '5', name: 'Hızlı Lojistik Merkezi', sector: 'Lojistik', city: 'Kocaeli' },
    { id: '6', name: 'Elit Restaurant Zinciri', sector: 'Horeca', city: 'Antalya' },
  ];

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCustomer = (customer: Customer) => {
    // ID ve İsim bilgisini sonraki sayfaya parametre olarak geçiyoruz
    navigation.navigate('BranchSelection', { 
      customerId: customer.id, 
      customerName: customer.name 
    });
  };

  const renderItem: ListRenderItem<Customer> = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleSelectCustomer(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Building2 size={24} color="#3B82F6" />
      </View>
      
      <View style={styles.cardInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <View style={styles.metaContainer}>
          <Text style={styles.sectorText}>{item.sector}</Text>
          <View style={styles.dot} />
          <View style={styles.locationContainer}>
            <MapPin size={12} color="#64748B" style={{marginRight: 4}} />
            <Text style={styles.locationText}>{item.city}</Text>
          </View>
        </View>
      </View>

      <ChevronRight size={20} color="#CBD5E1" />
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
        <Text style={styles.headerTitle}>Müşteri Seçimi</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Firma adı ara..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Müşteri bulunamadı.</Text>
          </View>
        }
      />
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectorText: {
    fontSize: 13,
    color: '#64748B',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 15,
  },
});

export default CustomerSelection;