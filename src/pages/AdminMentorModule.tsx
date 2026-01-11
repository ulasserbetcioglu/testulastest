import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { Users, FileText, ClipboardCheck, Settings, LogOut, ChevronRight } from 'lucide-react-native';

const AdminMentorHome = ({ navigation }) => {

  // Menü öğeleri listesi - İleride buraya yeni modüller eklenebilir
  const menuItems = [
    {
      id: 1,
      title: 'Müşteri İşlemleri',
      description: 'Müşteri seçimi, şube yönetimi ve tanımlamalar.',
      icon: <Users size={32} color="#0EA5E9" />, // Sky blue
      screen: 'CustomerSelection', // 1.1 adımında burayı kodlayacağız
    },
    {
      id: 2,
      title: 'Denetim Yönetimi',
      description: 'Aktif denetimler ve görev atamaları.',
      icon: <ClipboardCheck size={32} color="#22C55E" />, // Green
      screen: 'AuditManagement',
    },
    {
      id: 3,
      title: 'Raporlar & Analiz',
      description: 'Geçmiş denetim raporları ve özet veriler.',
      icon: <FileText size={32} color="#F59E0B" />, // Amber
      screen: 'Reports',
    },
    {
      id: 4,
      title: 'Ayarlar',
      description: 'Uygulama ve hesap ayarları.',
      icon: <Settings size={32} color="#64748B" />, // Slate
      screen: 'Settings',
    },
  ];

  const handleNavigation = (screenName) => {
    // Burada navigasyon kurgusu yapılacak
    // navigation.navigate(screenName);
    console.log(`${screenName} sayfasına gidiliyor...`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Üst Başlık Alanı */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Mentor</Text>
          <Text style={styles.headerSubtitle}>Hoş geldin, Yönetici</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton}>
          <LogOut size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Ana İçerik - Kartlar */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.card}
            onPress={() => handleNavigation(item.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.cardIconContainer}>
              {item.icon}
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <ChevronRight size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate-50 background
  },
  header: {
    flexDirection: 'row',
    justify,Content: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  content: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3, // Android shadow
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});

export default AdminMentorHome;