import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SafeAreaView, StatusBar, Switch, Alert } from 'react-native';
import { ArrowLeft, Save, Plus, Trash2, Calendar, Clock, Bug, FlaskConical } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: {
    params: {
      customerName: string;
      branchName: string;
    }
  };
}

// Kullanılan İlaç Veri Yapısı
interface ChemicalUsage {
  id: string;
  name: string;
  amount: string;
  unit: string; // ml, gr, tablet
  method: string; // Pülverize, Jel, Yemleme
}

const BiocidalApplicationForm: React.FC<Props> = ({ navigation, route }) => {
  const { customerName, branchName } = route.params || { customerName: '', branchName: '' };

  // Form State'leri
  const [date, setDate] = useState(new Date().toLocaleDateString('tr-TR'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [applicationArea, setApplicationArea] = useState(''); // m2
  const [targetPests, setTargetPests] = useState(''); // Örn: Hamamböceği, Karınca
  
  // Dinamik İlaç Listesi
  const [chemicals, setChemicals] = useState<ChemicalUsage[]>([]);
  
  // Yeni ilaç ekleme modalı yerine basit state (Gerçekte modal daha şık olur)
  const [tempChemName, setTempChemName] = useState('');
  const [tempChemAmount, setTempChemAmount] = useState('');

  const addChemical = () => {
    if (!tempChemName || !tempChemAmount) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilaç adı ve miktarını giriniz.');
      return;
    }
    
    const newChem: ChemicalUsage = {
      id: Date.now().toString(),
      name: tempChemName,
      amount: tempChemAmount,
      unit: 'ml', // Varsayılan
      method: 'Pülverize', // Varsayılan
    };

    setChemicals([...chemicals, newChem]);
    setTempChemName('');
    setTempChemAmount('');
  };

  const removeChemical = (id: string) => {
    setChemicals(chemicals.filter(c => c.id !== id));
  };

  const handleSaveForm = () => {
    if (chemicals.length === 0) {
      Alert.alert('Uyarı', 'En az bir ilaç girişi yapmalısınız.');
      return;
    }
    // API Kayıt İşlemi burada yapılacak
    Alert.alert(
      "Form Kaydedildi", 
      "EK-1 Formu başarıyla oluşturuldu.",
      [{ text: "Tamam", onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>EK-1 Uygulama Formu</Text>
            <Text style={styles.headerSubtitle}>{customerName} - {branchName}</Text>
        </View>
        <TouchableOpacity onPress={handleSaveForm} style={styles.saveButton}>
          <Save size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Bölüm 1: Tarih ve Saat */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Zaman Bilgileri</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tarih</Text>
              <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="GG.AA.YYYY" />
            </View>
            <View style={[styles.inputGroup, { marginHorizontal: 8 }]}>
              <Text style={styles.label}>Başlangıç</Text>
              <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="00:00" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bitiş</Text>
              <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="00:00" />
            </View>
          </View>
        </View>

        {/* Bölüm 2: Uygulama Alanı ve Hedef */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bug size={18} color="#EF4444" />
            <Text style={styles.sectionTitle}>Hedef ve Alan</Text>
          </View>
          
          <Text style={styles.label}>Hedef Haşereler</Text>
          <TextInput 
            style={styles.input} 
            value={targetPests} 
            onChangeText={setTargetPests} 
            placeholder="Örn: Alman Hamamböceği, Ev Faresi..." 
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Uygulama Alanı (m²)</Text>
          <TextInput 
            style={styles.input} 
            value={applicationArea} 
            onChangeText={setApplicationArea} 
            keyboardType="numeric"
            placeholder="Örn: 150" 
          />
        </View>

        {/* Bölüm 3: Kullanılan Ürünler (En Önemli Kısım) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FlaskConical size={18} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Kullanılan Biyosidal Ürünler</Text>
          </View>

          {/* İlaç Ekleme Formu (Basit) */}
          <View style={styles.addChemicalContainer}>
            <TextInput 
              style={[styles.input, { flex: 2, marginRight: 8 }]} 
              placeholder="İlaç Adı (Örn: K-Othrine)" 
              value={tempChemName}
              onChangeText={setTempChemName}
            />
            <TextInput 
              style={[styles.input, { flex: 1, marginRight: 8 }]} 
              placeholder="Miktar" 
              keyboardType="numeric"
              value={tempChemAmount}
              onChangeText={setTempChemAmount}
            />
            <TouchableOpacity style={styles.addButton} onPress={addChemical}>
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Eklenen İlaçlar Listesi */}
          {chemicals.length > 0 ? (
            <View style={styles.chemicalList}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeadText, { flex: 2 }]}>Ürün Adı</Text>
                <Text style={[styles.tableHeadText, { flex: 1 }]}>Miktar</Text>
                <Text style={[styles.tableHeadText, { flex: 1 }]}>Yöntem</Text>
                <View style={{ width: 30 }} />
              </View>
              
              {chemicals.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={[styles.tableText, { flex: 2 }]}>{item.name}</Text>
                  <Text style={[styles.tableText, { flex: 1 }]}>{item.amount} {item.unit}</Text>
                  <Text style={[styles.tableText, { flex: 1 }]}>{item.method}</Text>
                  <TouchableOpacity onPress={() => removeChemical(item.id)} style={styles.deleteButton}>
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Henüz ürün eklenmedi.</Text>
          )}
        </View>

        {/* Yasal Uyarı / İmza Alanı Temsili */}
        <View style={styles.footerNote}>
          <Text style={styles.legalText}>
            * Bu form Biyosidal Ürünlerin Kullanım Usul ve Esasları Hakkında Yönetmelik gereği düzenlenmiştir.
          </Text>
        </View>

      </ScrollView>
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
  saveButton: {
    padding: 8,
    backgroundColor: '#3B82F6', // Blue
    borderRadius: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  addChemicalContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#10B981', // Green
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  chemicalList: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableText: {
    fontSize: 13,
    color: '#334155',
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontStyle: 'italic',
    padding: 10,
  },
  footerNote: {
    padding: 10,
  },
  legalText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default BiocidalApplicationForm;