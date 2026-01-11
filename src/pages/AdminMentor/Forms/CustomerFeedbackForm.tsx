import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, StatusBar, ScrollView, Alert } from 'react-native';
import { ArrowLeft, MessageSquare, User, Star, Save, Frown, Meh, Smile } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: {
    params: {
      customerName: string;
      branchName: string;
    }
  };
}

const CustomerFeedbackForm: React.FC<Props> = ({ navigation, route }) => {
  const { customerName, branchName } = route.params || { customerName: '', branchName: '' };

  const [contactPerson, setContactPerson] = useState('');
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [satisfaction, setSatisfaction] = useState<number | null>(null); // 1: Kötü, 2: Orta, 3: İyi
  const [type, setType] = useState<'complaint' | 'suggestion' | 'satisfaction'>('complaint');

  const handleSave = () => {
    if (!contactPerson || !details || !satisfaction) {
      Alert.alert("Eksik Bilgi", "Lütfen kişi adı, detay ve memnuniyet durumunu giriniz.");
      return;
    }
    
    // API Kayıt işlemi burada yapılır
    Alert.alert(
      "Geri Bildirim Kaydedildi", 
      "Müşteri görüşü başarıyla sisteme işlendi.", 
      [{ text: "Tamam", onPress: () => navigation.goBack() }]
    );
  };

  const renderSatisfactionIcon = (level: number) => {
    const isActive = satisfaction === level;
    const color = isActive ? '#fff' : (level === 1 ? '#EF4444' : level === 2 ? '#F59E0B' : '#22C55E');
    const bgColor = isActive ? (level === 1 ? '#EF4444' : level === 2 ? '#F59E0B' : '#22C55E') : '#F1F5F9';

    let Icon = Meh;
    if (level === 1) Icon = Frown;
    if (level === 3) Icon = Smile;

    return (
      <TouchableOpacity 
        style={[styles.faceButton, { backgroundColor: bgColor }]} 
        onPress={() => setSatisfaction(level)}
      >
        <Icon size={32} color={color} />
        <Text style={[styles.faceText, isActive && { color: '#fff' }]}>
          {level === 1 ? 'Memnun Değil' : level === 2 ? 'Kısmen' : 'Memnun'}
        </Text>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Müşteri Görüş Formu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Bildirim Tipi */}
        <View style={styles.typeSelector}>
          {[
            { key: 'complaint', label: 'Şikayet' },
            { key: 'suggestion', label: 'Öneri' },
            { key: 'satisfaction', label: 'Memnuniyet' }
          ].map((item) => (
            <TouchableOpacity 
              key={item.key}
              style={[
                styles.typeButton, 
                type === item.key && styles.typeButtonActive,
                type === item.key && { borderColor: item.key === 'complaint' ? '#EF4444' : '#3B82F6' } // Şikayet kırmızı, diğerleri mavi
              ]}
              onPress={() => setType(item.key as any)}
            >
              <Text style={[styles.typeText, type === item.key && styles.typeTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Görüşü Bildiren Kişi */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Görüşü Bildiren Yetkili</Text>
          <View style={styles.inputContainer}>
            <User size={20} color="#94A3B8" style={{ marginLeft: 10 }} />
            <TextInput 
              style={styles.input} 
              placeholder="Ad Soyad" 
              value={contactPerson}
              onChangeText={setContactPerson}
            />
          </View>
        </View>

        {/* Konu Başlığı */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Konu Başlığı</Text>
          <TextInput 
            style={[styles.input, { paddingLeft: 12 }]} 
            placeholder="Örn: Geçen hafta yapılan uygulama hk." 
            value={topic}
            onChangeText={setTopic}
          />
        </View>

        {/* Memnuniyet Düzeyi */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Genel Memnuniyet Durumu</Text>
          <View style={styles.satisfactionRow}>
            {renderSatisfactionIcon(1)}
            {renderSatisfactionIcon(2)}
            {renderSatisfactionIcon(3)}
          </View>
        </View>

        {/* Açıklama */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Detaylı Açıklama</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Müşterinin ilettiği mesajı detaylıca yazınız..." 
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={details}
            onChangeText={setDetails}
          />
        </View>

        {/* Kaydet */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Save size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Formu Kaydet</Text>
        </TouchableOpacity>

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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  content: {
    padding: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  typeTextActive: {
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    minHeight: 120,
  },
  satisfactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  faceButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  faceText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButton: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CustomerFeedbackForm;