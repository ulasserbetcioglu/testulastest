import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Modal, TextInput, Alert } from 'react-native';
import { ArrowLeft, Trash2, Calendar, FileText, Plus, Truck } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: { params: { branchName: string } };
}

interface WasteRecord {
  id: string;
  date: string;
  disposalCompany: string; // Lisanslı bertaraf firması
  type: 'packaging' | 'biological' | 'chemical'; // Ambalaj, Karkas, Kimyasal
  amount: string; // kg veya adet
  docNumber: string; // Teslimat makbuz no
}

const WasteDisposalLog: React.FC<Props> = ({ navigation, route }) => {
  const branchName = route.params?.branchName || '-';

  const [records, setRecords] = useState<WasteRecord[]>([
    { id: '1', date: '01.12.2025', disposalCompany: 'İZAYDAŞ', type: 'packaging', amount: '5 kg', docNumber: 'A-1023' },
    { id: '2', date: '15.01.2026', disposalCompany: 'EKOVAR', type: 'biological', amount: '200 gr', docNumber: 'B-404' },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newRec, setNewRec] = useState<Partial<WasteRecord>>({});

  const addRecord = () => {
    if (!newRec.date || !newRec.amount) {
      Alert.alert('Eksik Bilgi', 'Tarih ve miktar zorunludur.');
      return;
    }
    const item: WasteRecord = {
      id: Date.now().toString(),
      date: newRec.date || '',
      disposalCompany: newRec.disposalCompany || '',
      type: (newRec.type as any) || 'packaging',
      amount: newRec.amount || '',
      docNumber: newRec.docNumber || ''
    };
    setRecords([item, ...records]);
    setModalVisible(false);
    setNewRec({});
  };

  const getTypeText = (type: string) => {
    switch(type) {
        case 'packaging': return 'Boş Ambalaj';
        case 'biological': return 'Biyolojik Atık';
        case 'chemical': return 'Kimyasal Atık';
        default: return type;
    }
  };

  const renderItem = ({ item }: { item: WasteRecord }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Trash2 size={24} color="#EF4444" />
      </View>
      <View style={styles.info}>
        <Text style={styles.company}>{item.disposalCompany}</Text>
        <Text style={styles.detail}>{getTypeText(item.type)} • {item.amount}</Text>
        <Text style={styles.docNo}>Belge No: {item.docNumber}</Text>
      </View>
      <View style={styles.dateBox}>
        <Calendar size={14} color="#64748B" />
        <Text style={styles.dateText}>{item.date}</Text>
      </View>
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
            <Text style={styles.title}>Atık İmha Takibi (6.1)</Text>
            <Text style={styles.subtitle}>{branchName}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList 
        data={records} 
        renderItem={renderItem} 
        keyExtractor={i => i.id} 
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Henüz atık kaydı yok.</Text>}
      />

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Yeni Atık Teslimatı</Text>
                <TextInput style={styles.input} placeholder="Tarih (GG.AA.YYYY)" value={newRec.date} onChangeText={t => setNewRec({...newRec, date: t})} />
                <TextInput style={styles.input} placeholder="Teslim Alan Firma (Örn: İZAYDAŞ)" value={newRec.disposalCompany} onChangeText={t => setNewRec({...newRec, disposalCompany: t})} />
                <TextInput style={styles.input} placeholder="Atık Tipi (Ambalaj/Biyolojik)" value={newRec.type} onChangeText={t => setNewRec({...newRec, type: t as any})} />
                <TextInput style={styles.input} placeholder="Miktar (Örn: 5 kg)" value={newRec.amount} onChangeText={t => setNewRec({...newRec, amount: t})} />
                <TextInput style={styles.input} placeholder="Belge / Makbuz No" value={newRec.docNumber} onChangeText={t => setNewRec({...newRec, docNumber: t})} />
                
                <TouchableOpacity style={styles.saveBtn} onPress={addRecord}>
                    <Text style={styles.saveBtnText}>Kaydet</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeBtnText}>İptal</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B' },
  addBtn: { padding: 10, backgroundColor: '#EF4444', borderRadius: 8 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth:1, borderColor:'#F1F5F9' },
  iconBox: { width: 44, height: 44, backgroundColor: '#FEF2F2', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  company: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  detail: { fontSize: 13, color: '#475569', marginTop: 2 },
  docNo: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  dateBox: { alignItems: 'flex-end' },
  dateText: { fontSize: 12, color: '#64748B', marginLeft: 4 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 20 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 12 },
  saveBtn: { backgroundColor: '#EF4444', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#64748B', fontWeight: '600' },
});

export default WasteDisposalLog;