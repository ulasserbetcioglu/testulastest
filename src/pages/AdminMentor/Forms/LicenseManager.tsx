import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Image, Alert } from 'react-native';
import { ArrowLeft, Award, Calendar, AlertTriangle, CheckCircle2, Camera } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: { params: { branchName: string } };
}

interface License {
  id: string;
  code: string; // PDF kodu (3.1, 3.2 vb)
  name: string;
  expiryDate: string; // GG.AA.YYYY
  status: 'valid' | 'expired' | 'warning';
  hasImage: boolean;
}

const LicenseManager: React.FC<Props> = ({ navigation, route }) => {
  const branchName = route.params?.branchName || '-';

  const [licenses, setLicenses] = useState<License[]>([
    { id: '1', code: '3.1', name: 'Biyosidal Uygulama İzin Belgesi', expiryDate: '12.05.2028', status: 'valid', hasImage: true },
    { id: '2', code: '3.2', name: 'Mesul Müdür Sertifikası', expiryDate: '01.01.2024', status: 'expired', hasImage: true },
    { id: '3', code: '3.2', name: 'Operatör Sertifikası (Ahmet Y.)', expiryDate: '20.02.2026', status: 'warning', hasImage: false },
    { id: '4', code: '14', name: 'Fumigasyon Ruhsatı', expiryDate: '-', status: 'valid', hasImage: false },
  ]);

  const getStatusColor = (status: string) => {
    if (status === 'valid') return '#22C55E';
    if (status === 'expired') return '#EF4444';
    return '#F59E0B'; // warning
  };

  const getStatusText = (status: string) => {
    if (status === 'valid') return 'Geçerli';
    if (status === 'expired') return 'Süresi Dolmuş';
    return 'Yaklaşıyor';
  };

  const handleUpload = (id: string) => {
    Alert.alert('Belge Yükle', 'Fotoğraf çekme veya galeriden seçme işlemi...');
  };

  const renderItem = ({ item }: { item: License }) => (
    <View style={[styles.card, { borderLeftColor: getStatusColor(item.status), borderLeftWidth: 5 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.code}>{item.code}</Text>
        <Text style={styles.name}>{item.name}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <View style={styles.dateContainer}>
            <Calendar size={14} color="#64748B" />
            <Text style={styles.dateText}>Son: {item.expiryDate}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload(item.id)}>
        <Camera size={16} color={item.hasImage ? "#3B82F6" : "#94A3B8"} />
        <Text style={[styles.uploadText, item.hasImage && {color: '#3B82F6'}]}>
            {item.hasImage ? 'Belgeyi Görüntüle' : 'Fotoğraf Yükle'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View>
            <Text style={styles.title}>İzin ve Ruhsatlar (3.1 - 3.2)</Text>
            <Text style={styles.subtitle}>{branchName}</Text>
        </View>
        <View style={{width:40}}/>
      </View>

      <FlatList 
        data={licenses} 
        renderItem={renderItem} 
        keyExtractor={i => i.id} 
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth:1, borderColor:'#F1F5F9', shadowColor:'#000', shadowOpacity:0.05, shadowRadius:4, elevation:2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  code: { fontSize: 11, fontWeight: 'bold', color: '#64748B', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateContainer: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 13, color: '#475569', marginLeft: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  uploadText: { fontSize: 13, color: '#64748B', marginLeft: 8, fontWeight: '600' },
});

export default LicenseManager;