import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, SectionList, TouchableOpacity, Platform, Modal, ActivityIndicator, FlatList, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { supabase, supabase2 } from '@/services/supabaseService';

export default function AlertsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchWards();

    const subscription = supabase
      .channel('sensors-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, payload => {
        fetchWards();
      })
      .subscribe();

    const subscription2 = supabase2
      .channel('readings-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensorreadings' }, payload => {
        fetchWards();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      supabase2.removeChannel(subscription2);
    };
  }, []);

  const fetchWards = async () => {
    try {
      setLoading(true);
      
      const { data: sensorsData, error: sErr } = await supabase.from('sensors').select('*, locations(*)').limit(100);
      if (sErr) throw sErr;

      const { data: readingsData, error: rErr } = await supabase2
        .from('sensorreadings')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(200);

      if (sensorsData && sensorsData.length > 0) {
        const mapped = sensorsData.map((s: any, index: number) => {
          const sensorId = s.SensorId || s.sensor_id || Math.random().toString();
          const readings = readingsData ? readingsData.filter((r: any) => (r.sensor_id === sensorId || r.SensorId === sensorId)) : [];
          
          let latestReading = null;
          if (readings.length > 0) latestReading = readings[0];
          
          let currentWaterLevel = latestReading?.water_level_cm || latestReading?.WaterLevelCm || 0;
          let danger = s.DangerThreshold || s.danger_threshold || 50;
          let warning = s.WarningThreshold || s.warning_threshold || 20;

          let st = 'safe';
          if (currentWaterLevel >= danger) st = 'heavy_flood';
          else if (currentWaterLevel >= warning) st = 'light_flood';
          
          let locName = s.SensorName || s.sensorname || `Cảm biến ${index}`;
          if (locName.indexOf(' (') > -1) {
             locName = locName.split(' (')[0];
          }

          let district = s.locations?.District || s.locations?.district || s.locations?.Address || s.locations?.address || 'TP.HCM';
          const locationId = s.LocationId || s.location_id || s.place_id || s.PlaceId || '';

          return {
            id: sensorId.toString(),
            locationId: locationId?.toString(),
            name: locName,
            district: district,
            status: st,
            waterLevel: `${(currentWaterLevel || 0).toFixed(1)}cm`
          };
        });

        const groups = mapped.reduce((acc: any, curr: any) => {
          if (!acc[curr.district]) acc[curr.district] = [];
          acc[curr.district].push(curr);
          return acc;
        }, {});

        const sectionData = Object.keys(groups).map(key => ({
          title: key,
          data: groups[key]
        }));
        setSections(sectionData);
      } else {
        setSections([]);
      }
    } catch (e: any) {
      console.warn('Data fetch failed.', e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSections = sections.map(section => ({
    title: section.title,
    data: section.data.filter((ward: any) => 
      ward.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ward.district.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.data.length > 0);

  const openHistoryModal = (area: any) => {
    setSelectedArea(area);
    setModalVisible(true);
    fetchHistoryForArea(area.id, area.name, area.locationId);
  };

  const fetchHistoryForArea = async (areaId: string, areaName: string, locationId?: string) => {
    try {
      setHistoryLoading(true);
      // Fetch general alerts or try to match area. We fetch recent 50 history. 
      // In a real DB, we would filter by equal id. For safety we fetch all and filter locally if column name is unknown.
      const { data, error } = await supabase2.from('history').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;

      if (Array.isArray(data)) {
        // Filter locally (some history might be generic or matching ID)
        let areaHistory = data.filter((h: any) => {
            const matchLocId = locationId && (h.locationId?.toString() === locationId || h.location_id?.toString() === locationId || h.place_id?.toString() === locationId);
            return h.sensor_id?.toString() === areaId || 
                   h.locationId?.toString() === areaId || 
                   h.location_id?.toString() === areaId ||
                   h.place_id?.toString() === areaId ||
                   matchLocId ||
                   (h.title && h.title.includes(areaName)) ||
                   (h.message && h.message.includes(areaName));
        });

        // Map the findings
        const mappedHistory = areaHistory.map((h: any) => {
          let type = 'info';
          const levelVal = h.level || h.severity || h.maxWaterLevel || 1;
          if (levelVal >= 3 || typeof levelVal === 'string' && ['danger', 'high'].some(k => levelVal.toLowerCase().includes(k))) type = 'critical';
          else if (levelVal === 2 || typeof levelVal === 'string' && ['warning', 'medium'].some(k => levelVal.toLowerCase().includes(k))) type = 'warning';

          const waterLevelText = h.max_water_level ? `${h.max_water_level.toFixed(1)} cm` : (h.maxWaterLevel ? `${parseFloat(h.maxWaterLevel).toFixed(1)} cm` : 'Không xác định');
          const isDanger = type === 'critical';

          return {
            id: h.id?.toString() || h.history_id?.toString() || h.historyId?.toString() || Math.random().toString(),
            title: h.title || (isDanger ? 'Ngập Lụt Nguy Hiểm' : 'Cảnh Báo Ngập Nhẹ'),
            message: h.message || h.description || `Mực nước ngập đo được lên tới ${waterLevelText}. Yêu cầu các phương tiện ưu tiên tìm tuyến đường vòng hoặc di chuyển chậm để đảm bảo an toàn.`,
            time: new Date(h.created_at || h.start_time || h.startTime || Date.now()).toLocaleString('vi-VN'),
            type: type
          };
        });
        setHistoryData(mappedHistory);
      }
    } catch (e: any) {
      console.warn('History fetch fail:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const renderAreaItem = ({ item, index }: any) => {
    let statusColor = '#0EA5E9';
    let statusBg = '#E0F2FE';
    let statusText = 'An toàn';
    let iconName: any = 'shield-check';

    if (item.status === 'heavy_flood') {
      statusColor = '#E11D48';
      statusBg = '#FFE4E6';
      statusText = 'Ngập nặng';
      iconName = 'waves';
    } else if (item.status === 'light_flood') {
      statusColor = '#F59E0B';
      statusBg = '#FEF3C7';
      statusText = 'Ngập nhẹ';
      iconName = 'water-alert';
    }

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(index * 100)}>
        <TouchableOpacity style={styles.wardCard} activeOpacity={0.7} onPress={() => openHistoryModal(item)}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, flexShrink: 1, paddingRight: 12 }}>
              <Text style={styles.wardName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.wardDistrict} numberOfLines={2}>{item.district}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <MaterialCommunityIcons name={iconName} size={14} color={statusColor} style={styles.badgeIcon} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <View style={styles.metricRow}>
              <MaterialCommunityIcons name="format-vertical-align-center" size={16} color="#8892B0" />
              <Text style={styles.metricText}>Mực nước: {item.waterLevel}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
               <Text style={{fontSize: 12, color: '#0EA5E9', marginRight: 4}}>Lịch sử</Text>
               <MaterialCommunityIcons name="chevron-right" size={20} color="#0EA5E9" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHistoryItem = ({ item, index }: { item: any; index: number }) => {
    let iconColors = ['#0EA5E9', '#0284C7'];
    let iconName: any = 'information';
    
    if (item.type === 'critical') {
      iconColors = ['#E11D48', '#BE123C'];
      iconName = 'alert-octagon';
    } else if (item.type === 'warning') {
      iconColors = ['#F59E0B', '#D97706'];
      iconName = 'alert';
    }

    return (
      <View style={styles.alertCard}>
        <LinearGradient colors={iconColors as any} style={styles.iconGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
          <MaterialCommunityIcons name={iconName} size={24} color="#FFF" />
        </LinearGradient>
        <View style={[styles.textContainer, { flexShrink: 1 }]}>
          <Text style={[styles.alertTitle, { color: iconColors[0] }]} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.alertMessage}>{item.message}</Text>
          <Text style={styles.alertTime}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={StyleSheet.absoluteFill}>
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop' }} 
          style={StyleSheet.absoluteFill}
          imageStyle={{ opacity: 0.5 }}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.85)' }]} />
      </View>
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tra Cứu & Cảnh Báo</Text>
          <Text style={styles.headerSubtitle}>Tình trạng và lịch sử ngập lụt khu vực</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={24} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm khu vực..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#8892B0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={[styles.emptyContainer, { paddingTop: 60 }]}>
             <ActivityIndicator size="large" color="#0EA5E9" />
             <Text style={styles.emptyText}>Đang tải dữ liệu khu vực...</Text>
          </View>
        ) : (
          <SectionList
            sections={filteredSections}
            keyExtractor={item => item.id}
            renderItem={renderAreaItem}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
              </View>
            )}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { paddingTop: 60 }]}>
                <MaterialCommunityIcons name="map-search-outline" size={64} color="#8892B0" />
                <Text style={styles.emptyText}>Không tìm thấy khu vực nào</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* HISTORY MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, flexShrink: 1, paddingRight: 16 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>Lịch sử cảnh báo</Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>{selectedArea?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {historyLoading ? (
               <View style={[styles.emptyContainer, { paddingTop: 40 }]}>
                 <ActivityIndicator size="large" color="#0EA5E9" />
                 <Text style={styles.emptyText}>Đang tải lịch sử...</Text>
               </View>
            ) : (
               <FlatList
                 data={historyData}
                 keyExtractor={item => item.id}
                 renderItem={renderHistoryItem}
                 contentContainerStyle={{ padding: 20 }}
                 ListEmptyComponent={
                   <View style={styles.emptyContainer}>
                     <MaterialCommunityIcons name="check-circle-outline" size={48} color="#10B981" />
                     <Text style={[styles.emptyText, {color: '#10B981', marginTop: 12}]}>Khu vực này hiện đang an toàn, chưa có cảnh báo ngập lụt nghiêm trọng.</Text>
                   </View>
                 }
               />
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  glowOrb: { position: 'absolute', width: 250, height: 250, borderRadius: 125, filter: 'blur(60px)' },
  safeArea: { flex: 1 },
  header: { padding: 24, paddingTop: 48, paddingBottom: 16 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: 1, marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#64748B' },
  searchContainer: { paddingHorizontal: 24, marginBottom: 16, zIndex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#0369A1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  searchInput: { flex: 1, height: 50, color: '#0F172A', fontSize: 16, marginLeft: 12 },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  sectionHeader: { backgroundColor: 'transparent', paddingVertical: 12, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(226, 232, 240, 0.5)' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155' },
  wardCard: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#0369A1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  wardName: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  wardDistrict: { fontSize: 14, color: '#64748B' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeIcon: { marginRight: 4 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  metricRow: { flexDirection: 'row', alignItems: 'center' },
  metricText: { color: '#64748B', marginLeft: 8, fontSize: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 24, textAlign: 'center' },
  emptyText: { color: '#8892B0', fontSize: 16, marginTop: 16, textAlign: 'center', lineHeight: 24 },
  
  // Modal bounds
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 14, color: '#0EA5E9', marginTop: 4, fontWeight: '600' },
  closeButton: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
  
  // History card
  alertCard: { flexDirection: 'row', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: 'rgba(255, 255, 255, 0.85)', shadowColor: '#0369A1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  iconGradient: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  textContainer: { flex: 1 },
  alertTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6, letterSpacing: 0.5 },
  alertMessage: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 10 },
  alertTime: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
});
