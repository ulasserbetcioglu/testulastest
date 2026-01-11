import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, StatusBar, ScrollView, Alert, Image } from 'react-native';
import { ArrowLeft, CheckCircle2, XCircle, Camera, Save, Calendar, FileText } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: {
    params: {
      title: string;
      code: string;
      desc: string;
    }
  };
}

const DocumentCheckDetail: React.FC<Props> = ({ navigation, route }) => {
  // Menüden gelen başlık ve açıklama bilgisini alıyoruz
  const { title, code, desc } = route.params || { title: 'Belge', code: '-', desc: '' };

  const [status, setStatus] = useState<'valid' | 'invalid' | null>(null);
  const [note, setNote] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); // Opsiyonel tarih
  const [hasPhoto, setHasPhoto] = useState(false); // Fotoğraf çekildi mi?

  const handleSave = () => {
    if (status === null) {
      Alert.alert("Durum Seçilmedi", "Lütfen evrak durumunu (Mevcut veya Eksik) işaretleyiniz.");
      return;
    }

    // Burada API'ye (veya global state'e) bu maddenin durumu kaydedilir
    Alert.alert(
      "Kaydedildi",
      `${code} kodlu madde başarıyla güncellendi.`,
      [{ text: "Menüye Dön", onPress: () => navigation.goBack() }]
    );
  };

  const handleCamera = () => {
    Alert.alert("Kamera", "Fotoğraf çekme ekranı açılıyor...", [
        { text: "Çekildi Say", onPress: () => setHasPhoto(true) }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerCode}>{code}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Başlık ve Açıklama */}
        <View style={styles.infoCard}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{desc}</Text>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <FileText size={16} color="#64748B" />
            <Text style={styles.infoText}>Bu belge denetim sırasında fiziksel olarak görülmelidir.</Text>
          </View>
        </View>

        {/* Durum Seçimi */}
        <Text style={styles.sectionLabel}>Durum Tespiti</Text>
        <View style={styles.statusContainer}>
          <TouchableOpacity 
            style={[styles.statusButton, status === 'valid' && styles.validActive]} 
            onPress={() => setStatus('valid')}
          >
            <CheckCircle2 size={24} color={status === 'valid' ? '#fff' : '#10B981'} />
            <Text style={[styles.statusText, status === 'valid' && { color: '#fff' }]}>Mevcut / Uygun</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statusButton, status === 'invalid' && styles.invalidActive]} 
            onPress={() => setStatus('invalid')}
          >
            <XCircle size={24} color={status === 'invalid' ? '#fff' : '#EF4444'} />
            <Text style={[styles.statusText, status === 'invalid' && { color: '#fff' }]}>Eksik / Hatalı</Text>
          </TouchableOpacity>
        </View>

        {/* Tarih Girişi (Opsiyonel - Ruhsatlar için) */}
        <Text style={styles.sectionLabel}>Belge Geçerlilik Tarihi (Varsa)</Text>
        <View style={styles.inputContainer}>
          <Calendar size={20} color="#94A3B8" />
          <TextInput 
            style={styles.input} 
            placeholder="GG.AA.YYYY" 
            value={expiryDate}
            onChangeText={setExpiryDate}
            keyboardType="numeric"
          />
        </View>

        {/* Not Alanı */}
        <Text style={styles.sectionLabel}>Denetçi Notu</Text>
        <TextInput 
          style={styles.textArea} 
          placeholder="Varsa eksiklik detaylarını veya belge numarasını not alınız..." 
          multiline
          numberOfLines={4}
          value={note}
          onChangeText={setNote}
          textAlignVertical="top"
        />

        {/* Fotoğraf Kanıtı */}
        <Text style={styles.sectionLabel}>Fotoğraf Kanıtı</Text>
        <TouchableOpacity style={[styles.photoButton, hasPhoto && styles.photoButtonActive]} onPress={handleCamera}>
          <Camera size={24} color={hasPhoto ? "#fff" : "#3B82F6"} />
          <Text style={[styles.photoText, hasPhoto && { color: '#fff' }]}>
            {hasPhoto ? 'Fotoğraf Eklendi (Değiştir)' : 'Belge Fotoğrafı Çek'}
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Kaydet Butonu */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Save size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Kontrolü Tamamla</Text>
        </TouchableOpacity>
      </View>

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
  headerCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 26,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  validActive: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  invalidActive: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  statusText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#64748B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
    marginBottom: 24,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  photoButtonActive: {
    backgroundColor: '#3B82F6',
    borderStyle: 'solid',
    borderColor: '#2563EB',
  },
  photoText: {
    marginLeft: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default DocumentCheckDetail;