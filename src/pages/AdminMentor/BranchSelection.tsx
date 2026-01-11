import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, ListRenderItem } from 'react-native';
import { Store, ArrowLeft, ChevronRight, MapPin, Phone, CheckCircle2, AlertCircle } from 'lucide-react-native';

// Navigation ve Route tipleri
interface Props {
  navigation: any;
  route: {
    params: {
      customerId: string;
      customerName: string;
    }
  };
}

// Şube/Birim verisi için Interface
interface Branch {
  id: string;
  name: string; // Örn: Ana Depo, Mutfak, Lobi
  type: string; // Örn: Üretim, Depolama, Ofis
  manager: string; // Şube yetkilisi
  lastAuditStatus: 'success' | 'warning' | 'pending'; // Son denetim durumu
}

const BranchSelection: React.FC<Props> = ({ navigation, route }) => {
  // Önceki sayfadan gelen verileri alıyoruz
  const { customerId, customerName } = route.params || { customerId: '0', customerName: 'Bilinmeyen Müşteri' };

  // Örnek Şube Verileri (Normalde customerId'ye göre API'den çekilir)
  const branches: Branch[] = [
    { id: '101', name: 'Merkez Üretim Hattı', type: 'Üretim', manager: 'Ahmet Yılmaz', lastAuditStatus: 'success' },
    { id: '102', name: 'Hammadde Deposu', type: 'Depolama', manager: 'Mehmet Demir', lastAuditStatus: 'warning' },
    { id: '103', name: 'Personel Yemekhanesi', type: 'Sosyal Alan', manager: 'Ayşe Kaya', lastAuditStatus: 'success' },
    { id: '104', name: 'İdari Ofisler', type: 'Ofis', manager: 'Fatma Çelik', lastAuditStatus: 'pending' },
    { id: '105', name: 'Dış Saha & Bahçe', type: 'Dış Alan', manager: 'Güvenlik Birimi', lastAuditStatus: 'success' },
  ];

  const handleSelectBranch = (branch: Branch) => {
    console.log(`Seçilen Şube: ${branch.name}`);
    // 1.3 Adımına (İşlem Seçimi / Denetim Başlatma) gidiyoruz
    // navigation.navigate('AuditAction', { 
    //   customerId, 
    //   customerName,
    //   branchId: branch.id,
    //   branchName: branch.name
    // });
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={16} color="#22C55E" />;
      case 'warning':
        return <AlertCircle size={16} color="#F59E0B" />;
      default:
        return <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#E2E8F0' }} />;
    }
  };

  const renderItem: ListRenderItem<Branch> = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleSelectBranch(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Store size={24} color="#6366F1" />
      </View>
      
      <View style={styles.cardInfo}>
        <Text style={styles.branchName}>{item.name}</Text>
        <View style={styles.metaRow}>
           <Text style={styles.typeText}>{item.type}</Text>
           <View style={styles.dot} />
           <Text style={styles.managerText}>{item.manager}</Text>
        </View>
      </View>

      <View style={styles.rightAction}>
        {/* Durum ikonu opsiyonel, sadece bilgi amaçlı */}
        <View style={styles.statusContainer}>
            {renderStatusIcon(item.lastAuditStatus)}
        </View>
        <ChevronRight size={20} color="#CBD5E1" style={{ marginLeft: 8 }} />
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
        <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>Müşteri</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{customerName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Bilgilendirme Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>Lütfen işlem yapmak istediğiniz birimi seçiniz.</Text>
      </View>

      {/* Liste */}
      <FlatList
        data={branches}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    paddingVertical: 12, // Biraz daha dar
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  infoBanner: {
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  infoText: {
    color: '#1E40AF',
    fontSize: 13,
    textAlign: 'center',
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
    backgroundColor: '#EEF2FF', // Indigo light bg
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 13,
    color: '#6366F1', // Indigo text
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  managerText: {
    fontSize: 13,
    color: '#64748B',
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContainer: {
    padding: 4,
  }
});

export default BranchSelection;