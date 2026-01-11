import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, SafeAreaView, StatusBar, Modal, Alert, ScrollView } from 'react-native';
import { ArrowLeft, Camera, AlertTriangle, Plus, Trash2, Calendar, CheckSquare, X } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: {
    params: {
      customerName: string;
      branchName: string;
    }
  };
}

// Risk/Aksiyon Veri Yapısı
interface RiskItem {
  id: string;
  location: string;       // Örn: Mutfak Gideri
  issue: string;          // Örn: Kapak kırık, haşere çıkışı var
  riskLevel: 'high' | 'medium' | 'low';
  action: string;         // Örn: Kapak yenilenmeli
  responsible: 'customer' | 'pestcontrol'; // Kim yapacak? Müşteri mi Biz mi?
  status: 'open' | 'closed';
}

const RiskActionPlan: React.FC<Props> = ({ navigation, route }) => {
  const { customerName, branchName } = route.params || { customerName: '', branchName: '' };

  // Risk Listesi
  const [risks, setRisks] = useState<RiskItem[]>([]);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  
  // Yeni Kayıt Form State'leri
  const [location, setLocation] = useState('');
  const [issue, setIssue] = useState('');
  const [action, setAction] = useState('');
  const [riskLevel, setRiskLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [responsible, setResponsible] = useState<'customer' | 'pestcontrol'>('customer');

  const handleAddRisk = () => {
    if (!location || !issue || !action) {
      Alert.alert('Eksik Bilgi', 'Lütfen lokasyon, sorun ve aksiyon alanlarını doldurunuz.');
      return;
    }

    const newRisk: RiskItem = {
      id: Date.now().toString(),
      location,
      issue,
      riskLevel,
      action,
      responsible,
      status: 'open',
    };

    setRisks([newRisk, ...risks]);
    resetForm();
    setModalVisible(false);
  };

  const resetForm = () => {
    setLocation('');
    setIssue('');
    setAction('');
    setRiskLevel('medium');
    setResponsible('customer');
  };

  const handleDelete = (id: string) => {
    Alert.alert("Sil", "Bu kaydı silmek istiyor musunuz?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", onPress: () => setRisks(risks.filter(r => r.id !== id)), style: 'destructive' }
    ]);
  };

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'high': return '#EF4444'; // Red
      case 'medium': return '#F59E0B'; // Orange
      case 'low': return '#3B82F6'; // Blue
      default: return '#94A3B8';
    }
  };

  const getRiskLabel = (level: string) => {
    switch(level) {
      case 'high': return 'Yüksek Risk';
      case 'medium': return 'Orta Risk';
      case 'low': return 'Düşük Risk';
      default: return '';
    }
  };

  const renderItem = ({ item }: { item: RiskItem }) => (
    <View style={[styles.card, { borderLeftColor: getRiskColor(item.riskLevel), borderLeftWidth: 6 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.locationBadge}>
            <Text style={styles.locationText}>{item.location}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Trash2 size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <Text style={styles.issueText}>{item.issue}</Text>
      
      <View style={styles.actionBox}>
        <Text style={styles.actionLabel}>Aksiyon:</Text>
        <Text style={styles.actionText}>{item.action}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.riskLevel) + '20' }]}>
            <AlertTriangle size={14} color={getRiskColor(item.riskLevel)} />
            <Text style={[styles.riskText, { color: getRiskColor(item.riskLevel) }]}>
                {getRiskLabel(item.riskLevel)}
            </Text>
        </View>
        
        <View style={styles.responsibleBadge}>
            <Text style={styles.responsibleText}>
                Sorumlu: {item.responsible === 'customer' ? 'Müşteri' : 'Pest Mentor'}
            </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Risk & Aksiyon Planı</Text>
          <Text style={styles.headerSubtitle}>{branchName}</Text>
        </View>
        <View style={{width: 40}} /> 
      </View>

      {/* Liste */}
      <FlatList
        data={risks}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckSquare size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>Henüz risk kaydı oluşturulmadı.</Text>
            <Text style={styles.emptySubText}>Yeni bir risk veya eksiklik eklemek için + butonunu kullanın.</Text>
          </View>
        }
      />

      {/* FAB (Floating Action Button) */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      {/* --- YENİ KAYIT MODALI --- */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Risk Bildirimi</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Lokasyon */}
              <Text style={styles.label}>Lokasyon / Bölge</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Örn: Mutfak, Depo girişi..." 
                value={location}
                onChangeText={setLocation}
              />

              {/* Sorun */}
              <Text style={styles.label}>Tespit Edilen Sorun</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Örn: Duvar dibinde açıklık var, fare girişi mümkün." 
                multiline
                numberOfLines={3}
                value={issue}
                onChangeText={setIssue}
              />

              {/* Fotoğraf Butonu (Temsili) */}
              <TouchableOpacity style={styles.photoButton} onPress={() => Alert.alert('Kamera', 'Kamera açılıyor...')}>
                <Camera size={20} color="#3B82F6" />
                <Text style={styles.photoText}>Fotoğraf Ekle</Text>
              </TouchableOpacity>

              {/* Risk Seviyesi */}
              <Text style={styles.label}>Risk Seviyesi</Text>
              <View style={styles.optionRow}>
                {['low', 'medium', 'high'].map((r) => (
                  <TouchableOpacity 
                    key={r}
                    style={[
                      styles.riskOption, 
                      riskLevel === r && { backgroundColor: getRiskColor(r), borderColor: getRiskColor(r) }
                    ]}
                    onPress={() => setRiskLevel(r as any)}
                  >
                    <Text style={[styles.riskOptionText, riskLevel === r && { color: '#fff' }]}>
                      {r === 'low' ? 'Düşük' : r === 'medium' ? 'Orta' : 'Yüksek'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Önerilen Aksiyon */}
              <Text style={styles.label}>Önerilen Aksiyon (Çözüm)</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Örn: Açıklık sıva veya alçı ile kapatılmalı." 
                multiline
                numberOfLines={3}
                value={action}
                onChangeText={setAction}
              />

              {/* Sorumlu */}
              <Text style={styles.label}>Sorumlu Taraf</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity 
                  style={[styles.respOption, responsible === 'customer' && styles.respOptionActive]}
                  onPress={() => setResponsible('customer')}
                >
                  <Text style={[styles.respText, responsible === 'customer' && styles.respTextActive]}>Müşteri</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.respOption, responsible === 'pestcontrol' && styles.respOptionActive]}
                  onPress={() => setResponsible('pestcontrol')}
                >
                  <Text style={[styles.respText, responsible === 'pestcontrol' && styles.respTextActive]}>Pest Mentor</Text>
                </TouchableOpacity>
              </View>

              {/* Kaydet Butonu */}
              <TouchableOpacity style={styles.saveButton} onPress={handleAddRisk}>
                <Text style={styles.saveButtonText}>Listeye Ekle</Text>
              </TouchableOpacity>
              <View style={{height: 20}} /> 
            </ScrollView>

          </View>
        </View>
      </Modal>

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
  listContent: {
    padding: 16,
    paddingBottom: 80, // FAB için boşluk
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  locationBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  issueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  actionBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actionText: {
    fontSize: 13,
    color: '#334155',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  responsibleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  responsibleText: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 8,
    textAlign: 'center',
    width: '70%',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 4,
    borderStyle: 'dashed',
  },
  photoText: {
    marginLeft: 8,
    color: '#3B82F6',
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  riskOption: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  riskOptionText: {
    fontWeight: '600',
    color: '#64748B',
  },
  respOption: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
  },
  respOptionActive: {
    backgroundColor: '#0F172A',
  },
  respText: {
    fontWeight: '600',
    color: '#64748B',
  },
  respTextActive: {
    color: '#fff',
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RiskActionPlan;