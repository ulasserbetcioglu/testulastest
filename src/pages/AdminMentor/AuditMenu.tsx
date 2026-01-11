import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList } from 'react-native';
import { ArrowLeft, FileText, ScanLine, FlaskConical, ClipboardList, MessageSquare, Map, ShieldCheck, Trash2, Info, ChevronRight } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: {
    params: {
      customerId: string;
      customerName: string;
      branchId: string;
      branchName: string;
    }
  };
}

const AuditMenu: React.FC<Props> = ({ navigation, route }) => {
  const { customerId, customerName, branchId, branchName } = route.params || { 
    customerId: '', customerName: '', branchId: '', branchName: '' 
  };

  const navParams = { customerId, customerName, branchId, branchName };

  // PDF LİSTESİNE GÖRE YAPILANDIRILMIŞ MENÜ
  const MENU_ITEMS = [
    {
      id: '1',
      code: '1.1',
      title: 'FAALİYET DOSYASI İÇERİĞİ',
      desc: 'Dosyanın içindekiler kısmı ve sayfa numaraları.',
      icon: <FileText size={24} color="#64748B" />, 
      targetScreen: 'DocumentCheckDetail' // Standart Kontrol
    },
    {
      id: '2',
      code: '1.2',
      title: 'MÜŞTERİ BİLGİLERİ',
      desc: 'Ticari ünvan, vergi dairesi ve iletişim bilgileri.',
      icon: <Info size={24} color="#3B82F6" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '3',
      code: '1.3',
      title: 'MÜŞTERİ ŞUBELERİNİN BİLGİLERİ',
      desc: 'Şube yetkilisi, m² ve özel konum bilgileri.',
      icon: <Map size={24} color="#3B82F6" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '4',
      code: '2.1',
      title: 'HİZMET SÖZLEŞMESİ',
      desc: 'Kapsam, süre ve garanti koşullarını belirleyen belge.',
      icon: <ShieldCheck size={24} color="#8B5CF6" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '5',
      code: '3.1',
      title: 'İZİN VE RUHSATLAR',
      desc: 'Biyosidal Ürün Uygulama İzin Belgesi.',
      icon: <FileText size={24} color="#F59E0B" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '6',
      code: '3.2',
      title: 'MESUL MÜDÜR VE OPERATÖR BELGELERİ',
      desc: 'Diploma, sertifika ve uygulayıcı belgeleri.',
      icon: <FileText size={24} color="#F59E0B" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '7',
      code: '4.1',
      title: 'EKİPMAN KROKİSİ (YERLEŞİM PLANI)',
      desc: 'İstasyon ve cihazların yerleşim planı (Harita).',
      icon: <Map size={24} color="#10B981" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '8',
      code: '4.2',
      title: 'EKİPMAN TAKİP FORMLARI',
      desc: 'İstasyon kontrolü, kırık/sağlam ve aktivite takibi.',
      icon: <ScanLine size={24} color="#EF4444" />, 
      targetScreen: 'StationControl', // ÖZEL FORM EKRANI
      highlight: true
    },
    {
      id: '9',
      code: '5.1',
      title: 'EK-1 UYGULAMA İŞLEM FORMU',
      desc: 'Yapılan ilaçlama, miktar ve yöntem bilgileri.',
      icon: <FlaskConical size={24} color="#10B981" />, 
      targetScreen: 'BiocidalApplicationForm', // ÖZEL FORM EKRANI
      highlight: true
    },
    {
      id: '10',
      code: '5.2',
      title: 'ONAYLI BİYOSİDAL ÜRÜN LİSTESİ',
      desc: 'İşletmede planlanan ilaçların toplu listesi.',
      icon: <FlaskConical size={24} color="#64748B" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '11',
      code: '5.3',
      title: 'BİYOSİDAL ÜRÜN KULLANIM KARTI',
      desc: 'Stok takibi ve yıllık kümülatif kullanım.',
      icon: <FileText size={24} color="#64748B" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '12',
      code: '5.4',
      title: 'RUHSAT, MSDS VE ETİKETLER',
      desc: 'İlaç ruhsatları, güvenlik bilgi formları ve etiketler.',
      icon: <FileText size={24} color="#64748B" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '13',
      code: '6.1',
      title: 'ATIK İMHA BELGESİ',
      desc: 'Boş ambalaj ve atıkların lisanslı firmaya teslimi.',
      icon: <Trash2 size={24} color="#EF4444" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '14',
      code: '3.2',
      title: 'FUMİGASYON RUHSATI',
      desc: 'Varsa fumigasyon işlem ruhsatı.',
      icon: <FileText size={24} color="#F59E0B" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '15',
      code: '5.5',
      title: 'BİYOSİDAL ÜRÜN GRUPLARI',
      desc: 'Kullanılan ürün grupları listesi.',
      icon: <FlaskConical size={24} color="#64748B" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '16',
      code: '4.3',
      title: 'TREND ANALİZ & RİSK DEĞERLENDİRME',
      desc: 'Aktivite trendleri ve risk aksiyon planı.',
      icon: <ClipboardList size={24} color="#F59E0B" />, 
      targetScreen: 'RiskActionPlan', // ÖZEL FORM EKRANI
      highlight: true
    },
    {
      id: '17',
      code: '4.3',
      title: 'MALİ SORUMLULUK SİGORTASI',
      desc: 'Zarar tazmin sigorta poliçesi.',
      icon: <ShieldCheck size={24} color="#3B82F6" />, 
      targetScreen: 'DocumentCheckDetail'
    },
    {
      id: '18',
      code: '4.3',
      title: 'ŞİKAYET VE MEMNUNİYET FORMLARI',
      desc: 'Müşteri geri bildirimleri ve çözüm kayıtları.',
      icon: <MessageSquare size={24} color="#EF4444" />, 
      targetScreen: 'CustomerFeedbackForm', // ÖZEL FORM EKRANI
      highlight: true
    },
    {
      id: '19',
      code: '4.3',
      title: 'ACİL DURUM BİLGİLENDİRME',
      desc: 'Acil çağrı ve prosedür bilgileri.',
      icon: <Info size={24} color="#EF4444" />, 
      targetScreen: 'DocumentCheckDetail'
    },
  ];

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.card, item.highlight && styles.highlightCard]}
      onPress={() => navigation.navigate(item.targetScreen, {
        ...navParams,
        // Detay sayfasına gidecekse bu bilgileri de gönderiyoruz
        title: item.title,
        code: item.code,
        desc: item.desc
      })}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {item.icon}
      </View>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <Text style={styles.cardSubtitle} numberOfLines={2}>{item.desc}</Text>
      </View>
      <ChevronRight size={20} color="#CBD5E1" />
    </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Dosya & İşlem Menüsü</Text>
            <Text style={styles.headerSubtitle}>{branchName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={MENU_ITEMS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.listHeader}>Faaliyet Dosyası İçeriği [1-19]</Text>
          }
        />
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
  listContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  listHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  highlightCard: {
    borderColor: '#BFDBFE', // Mavi çerçeve ile form sayfalarını öne çıkarıyoruz
    backgroundColor: '#EFF6FF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  codeBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});

export default AuditMenu;