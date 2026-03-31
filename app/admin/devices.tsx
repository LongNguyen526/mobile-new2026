import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/services/supabaseService';

export default function AdminDevicesScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('sensors').select('*, locations(*)').limit(100);
      
      if (error) {
        throw error;
      }
      
      setDevices(data || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: any) => {
    // Determine status from the real data or fallback
    let currentStatus = item.status || 'online'; 
    let statusColor = '#0EA5E9';
    let statusText = 'Hoạt động';

    if (currentStatus === 'offline' || currentStatus === 'Offline' || item.IsActive === false) {
      statusColor = '#E11D48';
      statusText = 'Mất kết nối';
    } else if (currentStatus === 'maintenance' || currentStatus === 'Maintenance') {
      statusColor = '#F59E0B';
      statusText = 'Đang bảo trì';
    }

    const sensorName = item.SensorName || item.sensorCode || item.sensorname || 'Chưa định danh';
    const location = item.locations?.Address || item.locations?.address || item.Specification || 'Vị trí chưa cập nhật';
    const typeLabel = item.SensorType || item.sensortype || 'Cảm biến mực nước';
    const battery = 'N/A';

    return (
      <View style={styles.deviceCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.deviceName}>{sensorName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#475569" />
            <Text style={styles.infoText}>{location}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="memory" size={16} color="#475569" />
            <Text style={styles.infoText}>{typeLabel}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="battery-charging" size={16} color="#475569" />
            <Text style={styles.infoText}>Pin: {battery}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Cấu hình lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Thiết Bị Đo</Text>
      </View>

      <View style={styles.controls}>
        <Text style={styles.subtitle}>Danh sách thiết bị lúc set up (Khu vực Q1)</Text>
        <TouchableOpacity style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Thêm Thiết Bị Mới</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={{ color: '#8892B0', textAlign: 'center', marginTop: 40 }}>Đang tải danh sách thiết bị...</Text>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={item => item.SensorId?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subtitle: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    marginRight: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardBody: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#475569',
    marginLeft: 8,
    fontSize: 14,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  actionText: {
    color: '#0EA5E9',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
