import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useNavigate } from 'react-router-dom';

// İkonlar
import { 
  Building2, Users, FileCheck, ClipboardList, FileText, 
  ShieldAlert, Bug, Target, Microscope, Trash2, 
  BookOpen, Award, ArrowRight
} from 'lucide-react-native';

const AdminMentorHome = () => {
  const navigate = useNavigate();

  // NOT: Adreslerin hepsi App.tsx'teki "path" değerleriyle tam eşleşmelidir.
  // Başlarına "/admin/mentor/" ekledim.
  const menuItems = [
    { id: '1', title: 'Şube Seçimi', icon: Building2, screen: '/admin/mentor/branch-selection', color: '#3B82F6' },
    { id: '2', title: 'Müşteri Seçimi', icon: Users, screen: '/admin/mentor/customer-selection', color: '#10B981' },
    { id: '3', title: 'Denetim Menüsü', icon: FileCheck, screen: '/admin/mentor/audit-menu', color: '#F59E0B' },
    { id: '4', title: 'Dosya Denetim', icon: ClipboardList, screen: '/admin/mentor/file-audit', color: '#6366F1' }, // App.tsx'te 'file-audit' tanımlıydı
    { id: '5', title: 'Denetim Özeti', icon: FileText, screen: '/admin/mentor/audit-summary', color: '#8B5CF6' },
    { id: '6', title: 'Biyosidal Uygulama', icon: Bug, screen: '/admin/mentor/BiocidalApplicationForm', color: '#EF4444' },
    { id: '7', title: 'İstasyon Kontrol', icon: Target, screen: '/admin/mentor/StationControl', color: '#EC4899' },
    { id: '8', title: 'Ürün Kullanımı', icon: Microscope, screen: '/admin/mentor/ProductUsageCard', color: '#14B8A6' },
    { id: '9', title: 'Onaylı Ürün Listesi', icon: ClipboardList, screen: '/admin/mentor/ApprovedProductList', color: '#F97316' },
    { id: '10', title: 'Atık Logları', icon: Trash2, screen: '/admin/mentor/WasteDisposalLog', color: '#64748B' },
    { id: '11', title: 'Müşteri Bilgileri', icon: BookOpen, screen: '/admin/mentor/CustomerInfoView', color: '#0EA5E9' },
    { id: '12', title: 'Lisans Yönetimi', icon: Award, screen: '/admin/mentor/LicenseManager', color: '#D946EF' },
    { id: '13', title: 'Risk Eylem Planı', icon: ShieldAlert, screen: '/admin/mentor/RiskActionPlan', color: '#EAB308' },
    { id: '14', title: 'Belge Kontrol', icon: FileCheck, screen: '/admin/mentor/DocumentCheckDetail', color: '#22C55E' },
  ];

  const handleNavigation = (path: string) => {
    try {
      console.log("Gidiliyor:", path);
      navigate(path);
    } catch (e) {
      console.error("Navigasyon hatası:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Mentor</Text>
          <Text style={styles.headerSubtitle}>Yönetim Paneli</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => handleNavigation(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <item.icon size={32} color={item.color} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Alt boşluk */}
        <View style={{height: 40}} /> 
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', minHeight: '100vh' }, // minHeight web için önemli
  header: { 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  scrollContent: { padding: 16 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    cursor: 'pointer' // Web'de tıklanabilir olduğunu gösterir
  },
  iconContainer: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12 
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#374151', 
    textAlign: 'center' 
  },
});

export default AdminMentorHome;