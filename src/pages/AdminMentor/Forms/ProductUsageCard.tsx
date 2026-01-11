import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { ArrowLeft, History, TrendingDown, Calendar } from 'lucide-react-native';

interface Props {
  navigation: any;
  route: { params: { branchName: string } };
}

const ProductUsageCard: React.FC<Props> = ({ navigation, route }) => {
  const branchName = route.params?.branchName || '-';

  // Örnek Veri: Hangi üründen ne kadar kullanılmış
  const usageData = [
    { id: '1', name: 'K-Othrine SC 50', totalUsed: '450 ml', stock: '550 ml', lastDate: '12.01.2026', movements: [
        { date: '12.01.2026', amount: '50 ml', user: 'Ahmet Y.' },
        { date: '05.01.2026', amount: '100 ml', user: 'Mehmet D.' },
    ]},
    { id: '2', name: 'Racumin Paste', totalUsed: '2.5 kg', stock: '7.5 kg', lastDate: '10.01.2026', movements: [] },
  ];

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.prodName}>{item.name}</Text>
        <Text style={styles.stockBadge}>Stok: {item.stock}</Text>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.stat}>
            <Text style={styles.statLabel}>Yıllık Toplam</Text>
            <Text style={styles.statValue}>{item.totalUsed}</Text>
        </View>
        <View style={[styles.stat, { alignItems: 'flex-end' }]}>
            <Text style={styles.statLabel}>Son İşlem</Text>
            <Text style={styles.statValue}>{item.lastDate}</Text>
        </View>
      </View>

      {/* Geçmiş Hareketler (Accordion gibi düşünülebilir) */}
      {item.movements.length > 0 && (
        <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>Son Hareketler:</Text>
            {item.movements.map((m: any, idx: number) => (
                <View key={idx} style={styles.historyRow}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                        <Calendar size={12} color="#94A3B8" />
                        <Text style={styles.historyDate}>{m.date}</Text>
                    </View>
                    <Text style={styles.historyUser}>{m.user}</Text>
                    <Text style={styles.historyAmount}>-{m.amount}</Text>
                </View>
            ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View>
            <Text style={styles.title}>Kullanım Kartları (5.3)</Text>
            <Text style={styles.subtitle}>{branchName}</Text>
        </View>
        <View style={{width:40}}/>
      </View>

      <FlatList 
        data={usageData} 
        renderItem={renderItem} 
        keyExtractor={i => i.id} 
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth:1, borderColor:'#F1F5F9', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, elevation:2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', marginBottom: 12 },
  prodName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  stockBadge: { fontSize: 12, color: '#15803D', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stat: { flex: 1 },
  statLabel: { fontSize: 11, color: '#64748B' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  historyBox: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginTop: 4 },
  historyTitle: { fontSize: 11, fontWeight: 'bold', color: '#64748B', marginBottom: 6 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyDate: { fontSize: 12, color: '#475569', marginLeft: 4 },
  historyUser: { fontSize: 12, color: '#475569' },
  historyAmount: { fontSize: 12, color: '#EF4444', fontWeight: 'bold' },
});

export default ProductUsageCard;