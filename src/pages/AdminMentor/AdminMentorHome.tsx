import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
// AŞAĞIDAKİ IMPORT ÇOK ÖNEMLİ:
import { useNavigation } from '@react-navigation/native';
import { 
  Building2, 
  Users, 
  FileCheck, 
  ClipboardList, 
  FileText, 
  ShieldAlert, 
  Bug, 
  Target, 
  Microscope,
  Trash2,
  BookOpen,
  Award
} from 'lucide-react-native';

// Fonksiyon tanımında parantez içini boş bırakın ve içeride hook kullanın
const AdminMentorHome = () => {
  // NAVIGASYON TANIMLAMASI BURADA YAPILIYOR:
  const navigation = useNavigation<any>();

  const menuItems = [
    { id: '1', title: 'Şube Seçimi', icon: Building2, screen: 'BranchSelection', color: '#3B82F6' },
    { id: '2', title: 'Müşteri Seçimi', icon: Users, screen: 'CustomerSelection', color: '#10B981' },
    { id: '3', title: 'Denetim Menüsü', icon: FileCheck, screen: 'AuditMenu', color: '#F59E0B' },
    { id: '4', title: 'Dosya Denetim', icon: ClipboardList, screen: 'FileAuditChecklist', color: '#6366F1' },
    { id: '5', title: 'Denetim Özeti', icon: FileText, screen: 'AuditSummary', color: '#8B5CF6' },
    { id: '6', title: 'Biyosidal Uygulama', icon: Bug, screen: 'BiocidalApplicationForm', color: '#EF4444' },
    { id: '7', title: 'İstasyon Kontrol', icon: Target, screen: 'StationControl', color: '#EC4899' },
    { id: '8', title: 'Ürün Kullanımı', icon: Microscope, screen: 'ProductUsageCard', color: '#14B8A6' },
    { id: '9', title: 'Onaylı Ürün Listesi', icon: ClipboardList, screen: 'ApprovedProductList', color: '#F97316' },
    { id: '10', title: 'Atık Logları', icon: Trash2, screen: 'WasteDisposalLog', color: '#64748B' },
    { id: '11', title: 'Müşteri Bilgileri', icon: BookOpen, screen: 'CustomerInfoView', color: '#0EA5E9' },
    { id: '12', title: 'Lisans Yönetimi', icon: Award, screen: 'LicenseManager', color: '#D946EF' },
    { id: '13', title: 'Risk Eylem Planı', icon: ShieldAlert, screen: 'RiskActionPlan', color: '#EAB308' },
    { id: '14', title: 'Belge Kontrol', icon: FileCheck, screen: 'DocumentCheckDetail', color: '#22C55E' },
  ];

  const handleNavigation = (screenName: string) => {
    // Artık bu satır hata vermeyecek
    navigation.navigate(screenName);
  };

  // ... (RETURN KISMI VE JSX KODLARINIZ AYNI KALABİLİR) ...
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Mentor</Text>
        <Text style={styles.headerSubtitle}>Yönetim Paneli</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => handleNavigation(item.screen)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <item.icon size={32} color={item.color} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  scrollContent: { padding: 16 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center' },
});

export default AdminMentorHome;