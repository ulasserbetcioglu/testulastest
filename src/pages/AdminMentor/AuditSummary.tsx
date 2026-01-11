import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, TextInput, Alert } from 'react-native';
import { ArrowLeft, CheckCircle2, AlertTriangle, FileText, Save, Share2 } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: {
    params: {
      customerName: string;
      branchName: string;
      totalItems: number;
      validCount: number;
      invalidItems: Array<{ code: string; title: string }>; // Hatalı maddelerin listesi
    }
  };
}

const AuditSummary: React.FC<Props> = ({ navigation, route }) => {
  const { customerName, branchName, totalItems, validCount, invalidItems } = route.params || { 
    customerName: '-', branchName: '-', totalItems: 0, validCount: 0, invalidItems: [] 
  };

  const [generalNote, setGeneralNote] = useState('');
  
  const score = totalItems > 0 ? Math.round((validCount / totalItems) * 100) : 0;
  
  // Skora göre renk belirleme
  const getScoreColor = () => {
    if (score >= 80) return '#22C55E'; // Green
    if (score >= 50) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  const handleFinish = () => {
    // Burada API'ye veri gönderilir (POST request)
    Alert.alert(
      "Denetim Tamamlandı",
      "Rapor başarıyla oluşturuldu ve merkeze iletildi.",
      [
        { text: "Tamam", onPress: () => navigation.navigate('AdminMentorHome') }
      ]
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
        <Text style={styles.headerTitle}>Denetim Özeti</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Skor Kartı */}
        <View style={styles.scoreCard}>
          <Text style={styles.customerTitle}>{customerName}</Text>
          <Text style={styles.branchTitle}>{branchName}</Text>
          
          <View style={styles.scoreCircleContainer}>
            <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
              <Text style={[styles.scoreText, { color: getScoreColor() }]}>%{score}</Text>
            </View>
            <Text style={styles.scoreLabel}>Uygunluk Puanı</Text>
          </View>
        </View>

        {/* Özet İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalItems}</Text>
            <Text style={styles.statLabel}>Toplam Madde</Text>
          </View>
          <View style={styles.statLine} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#22C55E' }]}>{validCount}</Text>
            <Text style={styles.statLabel}>Uygun</Text>
          </View>
          <View style={styles.statLine} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{invalidItems.length}</Text>
            <Text style={styles.statLabel}>Eksik/Hatalı</Text>
          </View>
        </View>

        {/* Eksiklikler Listesi (Varsa) */}
        {invalidItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={20} color="#EF4444" />
              <Text style={styles.sectionTitle}>Tespit Edilen Eksiklikler</Text>
            </View>
            <View style={styles.invalidList}>
              {invalidItems.map((item, index) => (
                <View key={index} style={styles.invalidItem}>
                  <Text style={styles.invalidCode}>{item.code}</Text>
                  <Text style={styles.invalidTitle}>{item.title}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Genel Not Alanı */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Genel Değerlendirme & Notlar</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Denetim ile ilgili genel kanaatinizi veya alınması gereken acil aksiyonları buraya yazınız..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={generalNote}
            onChangeText={setGeneralNote}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>

      {/* Alt Butonlar */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryButton}>
          <Share2 size={20} color="#64748B" />
          <Text style={styles.secondaryButtonText}>PDF Önizle</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
          <Save size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Denetimi Bitir</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  scoreCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  customerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  branchTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  scoreCircleContainer: {
    alignItems: 'center',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statLine: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 8,
  },
  invalidList: {
    backgroundColor: '#FEF2F2', // Light red bg
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  invalidItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  invalidCode: {
    fontWeight: 'bold',
    color: '#EF4444',
    marginRight: 8,
    minWidth: 30,
  },
  invalidTitle: {
    flex: 1,
    color: '#7F1D1D',
    fontSize: 14,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 120,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  secondaryButtonText: {
    color: '#475569',
    fontWeight: '600',
    marginLeft: 8,
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AuditSummary;