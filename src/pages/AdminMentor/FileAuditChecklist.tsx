import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, Modal, ScrollView, Alert } from 'react-native';
import { ArrowLeft, CheckCircle2, XCircle, Info, AlertTriangle, ChevronDown, ChevronUp, Save } from 'lucide-react-native';

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

// Denetim Maddesi Tipi
interface AuditItem {
  id: string;      // Kod tarafındaki unique ID
  code: string;    // Ekranda görünen kod (1.1, 1.2 vb.)
  title: string;
  description: string;
}

const FileAuditChecklist: React.FC<Props> = ({ navigation, route }) => {
  const { customerName, branchName } = route.params || { customerName: '', branchName: '' };
  
  // Hangi maddenin durumu ne? (valid: Var, invalid: Yok/Hatalı, null: Seçilmedi)
  const [auditStatus, setAuditStatus] = useState<{ [key: string]: 'valid' | 'invalid' | null }>({});
  
  // Açıklaması açık olan maddeler
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  // Kullanıcının verdiği liste verisi
  const AUDIT_DATA: AuditItem[] = [
    { id: '1', code: '1.1', title: 'FAALİYET DOSYASI İÇERİĞİ', description: 'Dosyanın "İçindekiler" kısmıdır. Denetçinin aradığı belgeyi hızlıca bulmasını sağlayan sayfa numaralarının veya bölüm adlarının olduğu listedir.' },
    { id: '2', code: '1.2', title: 'MÜŞTERİ BİLGİLERİ', description: 'Hizmeti alan firmanın (müşterinin) resmi ticari ünvanı, vergi dairesi, vergi numarası, açık adresi ve iletişim bilgilerinin bulunduğu bilgi formudur.' },
    { id: '3', code: '1.3', title: 'MÜŞTERİ ŞUBELERİNİN BİLGİLERİ', description: 'Eğer hizmet alan firma zincir bir işletmeyse, hizmetin verildiği o spesifik şubenin yetkilisi, metrekaresi ve özel konum bilgilerini içerir.' },
    { id: '4', code: '2.1', title: 'HİZMET SÖZLEŞMESİ', description: 'Hizmeti veren (Pestmentor) ile Müşteri arasında imzalanmış, hizmetin kapsamını, süresini ve yasal yükümlülükleri belirleyen resmi hukuki belgedir.' },
    { id: '5', code: '3.1', title: 'İZİN VE RUHSATLARI', description: 'Hizmet veren firmanın "Biyosidal Ürün Uygulama İzin Belgesi". Ayrıca vergi levhası ve ticaret sicil gazetesi.' },
    { id: '6', code: '3.2', title: 'MESUL MÜDÜR VE OPERATÖR SERTİFİKALARI', description: 'Mesul Müdür diploması ve sertifikası ile sahada uygulama yapan personelin "Biyosidal Ürün Uygulayıcı Sertifikası".' },
    { id: '7', code: '4.1', title: 'ZARARLI MÜCADELESİ EKİPMAN KROKİSİ', description: 'İşletmenin planı üzerinde; istasyonların, tuzakların veya LFT cihazlarının nerede olduğunu gösteren numaralandırılmış yerleşim planıdır.' },
    { id: '8', code: '4.2', title: 'EKİPMAN TAKİP FORMLARI', description: 'Krokide yer alan istasyonların kontrol edildiğini, kırık/sağlam durumunu ve aktivite görülüp görülmediğini gösteren çizelgeler.' },
    { id: '9', code: '5.1', title: 'EK-1 BİYOSİDAL ÜRÜN UYGULAMA İŞLEM FORMU', description: 'Her ilaçlama sonrası doldurulması zorunlu olan, kullanılan ilaç, miktar ve yöntemi içeren resmi form.' },
    { id: '10', code: '5.2', title: 'ONAYLI BİYOSİDAL ÜRÜN LİSTESİ', description: 'İşletmede kullanılması planlanan tüm ilaçların (insektisit, rontentisit vb.) toplu listesidir.' },
    { id: '11', code: '5.3', title: 'BİYOSİDAL ÜRÜN KULLANIM KARTI', description: 'Stok takibi veya spesifik bir ürünün işletmede kümülatif olarak ne kadar kullanıldığını gösteren takip kartı.' },
    { id: '12', code: '5.4', title: 'BİYOSİDAL ÜRÜN RUHSATLARI, MSDS VE ETİKET', description: 'İlacın Bakanlık onayı (Ruhsat), Güvenlik Bilgi Formu (MSDS) ve Etiket fotokopileri.' },
    { id: '13', code: '6.1', title: 'ATIK İMHA BELGESİ', description: 'Boşalan ilaç ambalajlarının veya toplanan kemirgen ölülerinin lisanslı firmalara teslim edildiğini kanıtlayan belgeler.' },
    { id: '14', code: '3.2', title: 'FUMİGASYON RUHSATI', description: 'Eğer fumigasyon yapılıyorsa gerekli özel ruhsat belgeleri.' },
    { id: '15', code: '5.5', title: 'BİYOSİDAL ÜRÜN GRUPLARI LİSTESİ', description: 'Kullanılan ürünlerin gruplandırılmış listesi.' },
    { id: '16', code: '4.3', title: 'TREND ANALİZ, RİSK DEĞERLENDİRME', description: 'Haşere aktivite trendleri, risk analizi ve eylem aksiyon planları.' },
    { id: '17', code: '4.3', title: 'MALİ SORUMLULUK SİGORTA POLİÇESİ', description: 'Hizmet verenin mali mesuliyet sigortası.' },
    { id: '18', code: '4.3', title: 'MÜŞTERİ ŞİKAYET VE MEMNUNİYET FORMLARI', description: 'Müşteri geri bildirimleri ve şikayet kayıtları.' },
    { id: '19', code: '4.3', title: 'ACİL DURUM BİLGİLENDİRME METNİ', description: 'Acil çağrı bilgileri ve acil durum prosedürleri.' },
  ];

  const toggleStatus = (id: string, status: 'valid' | 'invalid') => {
    setAuditStatus(prev => ({
      ...prev,
      [id]: prev[id] === status ? null : status
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const calculateProgress = () => {
    const total = AUDIT_DATA.length;
    const answered = Object.values(auditStatus).filter(s => s !== null).length;
    return Math.round((answered / total) * 100);
  };

  const handleSave = () => {
    const progress = calculateProgress();
    Alert.alert(
      "Denetim Kaydedilsin mi?",
      `Toplam ${AUDIT_DATA.length} maddeden ${Object.keys(auditStatus).length} tanesi işaretlendi. (%${progress})`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Kaydet ve Bitir", onPress: () => navigation.navigate('AdminMentorHome') } // Şimdilik anasayfaya atıyor
      ]
    );
  };

  const renderItem = ({ item }: { item: AuditItem }) => {
    const status = auditStatus[item.id];
    const isExpanded = expandedItems[item.id];

    return (
      <View style={styles.card}>
        {/* Üst Satır: Kod ve Başlık */}
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.8}
        >
          <View style={styles.titleContainer}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <Text style={styles.titleText}>{item.title}</Text>
          </View>
          {isExpanded ? <ChevronUp size={20} color="#94A3B8" /> : <ChevronDown size={20} color="#94A3B8" />}
        </TouchableOpacity>

        {/* Açıklama Alanı (Expandable) */}
        {isExpanded && (
          <View style={styles.descriptionContainer}>
            <View style={styles.descriptionRow}>
              <Info size={16} color="#6366F1" style={{marginTop: 2}} />
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          </View>
        )}

        {/* Aksiyon Butonları */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionButton, status === 'valid' && styles.validButtonActive]}
            onPress={() => toggleStatus(item.id, 'valid')}
          >
            <CheckCircle2 size={20} color={status === 'valid' ? '#fff' : '#10B981'} />
            <Text style={[styles.actionText, status === 'valid' && styles.activeText]}>Mevcut</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, status === 'invalid' && styles.invalidButtonActive]}
            onPress={() => toggleStatus(item.id, 'invalid')}
          >
            <XCircle size={20} color={status === 'invalid' ? '#fff' : '#EF4444'} />
            <Text style={[styles.actionText, status === 'invalid' && styles.activeText]}>Eksik/Hatalı</Text>
          </TouchableOpacity>
        </View>
      </View>
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
          <Text style={styles.headerBranch}>{branchName}</Text>
          <Text style={styles.headerCustomer}>{customerName}</Text>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Save size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${calculateProgress()}%` }]} />
        </View>
        <Text style={styles.progressText}>Tamamlanan: %{calculateProgress()}</Text>
      </View>

      <FlatList
        data={AUDIT_DATA}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerBranch: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerCustomer: {
    fontSize: 12,
    color: '#64748B',
  },
  saveButton: {
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  codeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  descriptionRow: {
    flexDirection: 'row',
  },
  descriptionText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  validButtonActive: {
    backgroundColor: '#10B981', // Green
  },
  invalidButtonActive: {
    backgroundColor: '#EF4444', // Red
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  activeText: {
    color: '#fff',
  },
});

export default FileAuditChecklist;