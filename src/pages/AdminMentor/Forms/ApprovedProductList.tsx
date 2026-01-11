import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Modal, TextInput, Alert } from 'react-native';
import { ArrowLeft, FlaskConical, Plus, Trash2, Check, X, Filter } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: { params: { branchName: string } };
}

interface Product {
  id: string;
  name: string;       // Örn: K-Othrine SC 50
  activeIngredient: string; // Örn: Deltamethrin
  group: string;      // Örn: İnsektisit (Yürüyen)
  licenseNo: string;  // Ruhsat No
  approved: boolean;  // Müşteri onayı var mı?
}

const ApprovedProductList: React.FC<Props> = ({ navigation, route }) => {
  const branchName = route.params?.branchName || '-';

  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'K-Othrine SC 50', activeIngredient: 'Deltamethrin', group: 'İnsektisit', licenseNo: '2011/123', approved: true },
    { id: '2', name: 'Racumin Paste', activeIngredient: 'Coumatetralyl', group: 'Rodentisit', licenseNo: '2015/456', approved: true },
    { id: '3', name: 'Goliath Gel', activeIngredient: 'Fipronil', group: 'Jel Yem', licenseNo: '2018/789', approved: false }, // Onaylanmamış örnek
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newProd, setNewProd] = useState({ name: '', active: '', group: '', license: '' });

  const addProduct = () => {
    if (!newProd.name || !newProd.group) {
      Alert.alert('Eksik', 'Ürün adı ve grubu zorunludur.');
      return;
    }
    const newItem: Product = {
      id: Date.now().toString(),
      name: newProd.name,
      activeIngredient: newProd.active,
      group: newProd.group,
      licenseNo: newProd.license,
      approved: true
    };
    setProducts([...products, newItem]);
    setModalVisible(false);
    setNewProd({ name: '', active: '', group: '', license: '' });
  };

  const removeProduct = (id: string) => {
    Alert.alert('Sil', 'Bu ürünü listeden çıkarmak istiyor musunuz?', [
      { text: 'Hayır', style: 'cancel' },
      { text: 'Evet', onPress: () => setProducts(products.filter(p => p.id !== id)) }
    ]);
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <FlaskConical size={24} color={item.group === 'Rodentisit' ? '#EF4444' : '#3B82F6'} />
      </View>
      <View style={styles.info}>
        <Text style={styles.prodName}>{item.name}</Text>
        <Text style={styles.prodDetail}>{item.activeIngredient} • {item.licenseNo}</Text>
        <Text style={styles.prodGroup}>{item.group}</Text>
      </View>
      <View style={styles.actions}>
        {item.approved ? (
          <View style={styles.approvedBadge}>
             <Check size={14} color="#15803D" />
             <Text style={styles.approvedText}>Onaylı</Text>
          </View>
        ) : (
          <View style={styles.pendingBadge}>
             <X size={14} color="#B45309" />
             <Text style={styles.pendingText}>Pasif</Text>
          </View>
        )}
        <TouchableOpacity onPress={() => removeProduct(item.id)} style={styles.delBtn}>
          <Trash2 size={18} color="#94A3B8" />
        </TouchableOpacity>
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
            <Text style={styles.title}>Onaylı Ürün Listesi (5.2)</Text>
            <Text style={styles.subtitle}>{branchName}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList 
        data={products} 
        renderItem={renderItem} 
        keyExtractor={i => i.id} 
        contentContainerStyle={{ padding: 16 }}
      />

      {/* Ürün Ekleme Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Biyosidal Ürün Ekle</Text>
            
            <TextInput style={styles.input} placeholder="Ürün Ticari Adı" value={newProd.name} onChangeText={t => setNewProd({...newProd, name: t})} />
            <TextInput style={styles.input} placeholder="Aktif Madde" value={newProd.active} onChangeText={t => setNewProd({...newProd, active: t})} />
            <TextInput style={styles.input} placeholder="Ürün Grubu (İnsektisit vb.)" value={newProd.group} onChangeText={t => setNewProd({...newProd, group: t})} />
            <TextInput style={styles.input} placeholder="Ruhsat Numarası" value={newProd.license} onChangeText={t => setNewProd({...newProd, license: t})} />
            
            <TouchableOpacity style={styles.saveBtn} onPress={addProduct}>
              <Text style={styles.saveBtnText}>Listeye Ekle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Vazgeç</Text>
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
  addBtn: { padding: 10, backgroundColor: '#10B981', borderRadius: 8 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth:1, borderColor:'#F1F5F9' },
  iconBox: { width: 44, height: 44, backgroundColor: '#F1F5F9', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  prodName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  prodDetail: { fontSize: 12, color: '#64748B', marginTop: 2 },
  prodGroup: { fontSize: 11, color: '#3B82F6', marginTop: 4, fontWeight: '600' },
  actions: { alignItems: 'flex-end', justifyContent: 'space-between', height: 44 },
  approvedBadge: { flexDirection:'row', alignItems:'center', backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  approvedText: { fontSize: 10, color: '#15803D', fontWeight: 'bold', marginLeft: 2 },
  pendingBadge: { flexDirection:'row', alignItems:'center', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pendingText: { fontSize: 10, color: '#B45309', fontWeight: 'bold', marginLeft: 2 },
  delBtn: { padding: 4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 12 },
  saveBtn: { backgroundColor: '#3B82F6', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#64748B', fontWeight: '600' },
});

export default ApprovedProductList;