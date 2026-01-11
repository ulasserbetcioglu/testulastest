import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, TextInput, Alert } from 'react-native';
import { ArrowLeft, Building, MapPin, Hash, User, Save, Phone } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: { params: { customerName: string; branchName: string } };
}

const CustomerInfoView: React.FC<Props> = ({ navigation, route }) => {
  const { customerName, branchName } = route.params || { customerName: '', branchName: '' };

  const [info, setInfo] = useState({
    title: customerName || 'Lezzet Gıda A.Ş.',
    taxOffice: 'Bursa / Nilüfer',
    taxNo: '1234567890',
    address: 'Organize Sanayi Bölgesi, 5. Cadde No:10',
    manager: 'Ahmet Yılmaz',
    phone: '0532 123 45 67',
    area: '1500', // m2
  });

  const handleSave = () => {
    Alert.alert('Başarılı', 'Müşteri bilgileri güncellendi.');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Firma Bilgileri (1.2 - 1.3)</Text>
        <TouchableOpacity onPress={handleSave}>
            <Save size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>1.2. Ticari Bilgiler</Text>
            
            <View style={styles.inputGroup}>
                <Building size={18} color="#64748B" style={styles.icon} />
                <View style={{flex:1}}>
                    <Text style={styles.label}>Resmi Ünvan</Text>
                    <TextInput style={styles.input} value={info.title} onChangeText={t => setInfo({...info, title: t})} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Hash size={18} color="#64748B" style={styles.icon} />
                <View style={{flex:1}}>
                    <Text style={styles.label}>Vergi Dairesi / No</Text>
                    <View style={{flexDirection:'row', gap:10}}>
                        <TextInput style={[styles.input, {flex:1}]} value={info.taxOffice} onChangeText={t => setInfo({...info, taxOffice: t})} />
                        <TextInput style={[styles.input, {flex:1}]} value={info.taxNo} keyboardType="numeric" onChangeText={t => setInfo({...info, taxNo: t})} />
                    </View>
                </View>
            </View>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>1.3. Şube & İletişim</Text>
            
            <View style={styles.inputGroup}>
                <User size={18} color="#64748B" style={styles.icon} />
                <View style={{flex:1}}>
                    <Text style={styles.label}>Şube Yetkilisi</Text>
                    <TextInput style={styles.input} value={info.manager} onChangeText={t => setInfo({...info, manager: t})} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Phone size={18} color="#64748B" style={styles.icon} />
                <View style={{flex:1}}>
                    <Text style={styles.label}>İletişim</Text>
                    <TextInput style={styles.input} value={info.phone} keyboardType="phone-pad" onChangeText={t => setInfo({...info, phone: t})} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <MapPin size={18} color="#64748B" style={styles.icon} />
                <View style={{flex:1}}>
                    <Text style={styles.label}>Açık Adres</Text>
                    <TextInput style={[styles.input, {height:60}]} multiline value={info.address} onChangeText={t => setInfo({...info, address: t})} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <View style={{width:18, alignItems:'center'}}><Text style={{fontWeight:'bold', color:'#64748B'}}>M²</Text></View>
                <View style={{flex:1, marginLeft:12}}>
                    <Text style={styles.label}>İşletme Alanı (m²)</Text>
                    <TextInput style={styles.input} value={info.area} keyboardType="numeric" onChangeText={t => setInfo({...info, area: t})} />
                </View>
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  content: { padding: 20 },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth:1, borderColor:'#E2E8F0' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#3B82F6', marginBottom: 16, textTransform: 'uppercase' },
  inputGroup: { flexDirection: 'row', marginBottom: 16 },
  icon: { marginTop: 10, marginRight: 12 },
  label: { fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A' },
});

export default CustomerInfoView;