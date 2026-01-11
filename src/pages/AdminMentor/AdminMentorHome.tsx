import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Alert } from 'react-native';

// DEĞİŞİKLİK 1: Mobil navigasyon yerine Web navigasyon kancasını (hook) çağırıyoruz
// Çünkü projenizin ana yapısı (Layout/App) web tabanlı "react-router-dom" kullanıyor.
import { useNavigate } from 'react-router-dom';

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
  Award,
  ArrowRight
} from 'lucide-react-native'; // Veya 'lucide-react'

const AdminMentorHome = () => {
  // DEĞİŞİKLİK 2: Hook tanımı değişti
  const navigate = useNavigate();

  const menuItems = [
    { id: '1', title: 'Şube Seçimi', icon: Building2, screen: 'branch-selection', color: '#3B82F6' },
    { id: '2', title: 'Müşteri Seçimi', icon: Users, screen: 'customer-selection', color: '#10B981' },
    { id: '3', title: 'Denetim Menüsü', icon: FileCheck, screen: 'audit-menu', color: '#F59E0B' },
    { id: '4', title: 'Dosya Denetim', icon: ClipboardList, screen: 'file-audit-checklist', color: '#6366F1' },
    { id: '5', title: 'Denetim Özeti', icon: FileText, screen: 'audit-summary', color: '#8B5CF6' },
    { id: '6', title: 'Biyosidal Uygulama', icon: Bug, screen: 'biocidal-application-form', color: '#EF4444' },
    { id: '7', title: 'İstasyon Kontrol', icon: Target, screen: 'station-control', color: '#EC4899' },
    { id: '8', title: 'Ürün Kullanımı', icon: Microscope, screen: 'product-usage-card', color: '#14B8A6' },
    { id: '9', title: 'Onaylı Ürün Listesi', icon: ClipboardList, screen: 'approved-product-list', color: '#F97316' },
    { id: '10', title: 'Atık Logları', icon: Trash2, screen: 'waste-disposal-log', color: '#64748B' },
    { id: '11', title: 'Müşteri Bilgileri', icon: BookOpen, screen: 'customer-info-view', color: '#0EA5E9' },
    { id: '12', title: 'Lisans Yönetimi', icon: Award, screen: 'license-manager', color: '#D946EF' },
    { id: '13', title: 'Risk Eylem Planı', icon: ShieldAlert, screen: 'risk-action-plan', color: '#EAB308' },
    { id: '14', title: 'Belge Kontrol', icon: FileCheck, screen: 'document-check-detail', color: '#22C55E' },
  ];

  const handleNavigation = (screenPath: string) => {
    // DEĞİŞİKLİK 3: Yönlendirme mantığı
    // Web router kullandığımız için rotanın başına '/' ekleyerek yönlendiriyoruz.
    // Not: Bu sayfaların "App.tsx" veya router dosyanızda tanımlı olması gerekir.
    try {
      // Eğer route tanımlı değilse sadece log basar, uygulama çökmez.
      navigate(`/${screenPath}`);
      console.log(`Yönlendiriliyor: /${screenPath}`);
    } catch (error) {
      console.error("Yönlendirme hatası:", error);
      Alert.alert("Hata", "Bu sayfaya şu an gidilemiyor.");
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
        <TouchableOpacity style={styles.profileButton}>
            {/* Profil ikonu vb. olabilir */}
        </TouchableOpacity>
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
              <View style={styles.arrowContainer}>
                 {/* Arrow iconu eklenebilir */}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{height: 40}} /> 
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', height: '100%' },
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
  profileButton: { padding: 8 },
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
    borderColor: '#f0f0f0'
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
  arrowContainer: { position: 'absolute', top: 10, right: 10 }
});

export default AdminMentorHome;