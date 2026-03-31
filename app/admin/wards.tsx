import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const MOCK_WARDS = [
  { id: '1', name: 'Phường Bến Nghé', district: 'Quận 1', status: 'safe', enabled: true },
  { id: '2', name: 'Phường Bến Thành', district: 'Quận 1', status: 'heavy_flood', enabled: true },
  { id: '3', name: 'Phường Nguyễn Thái Bình', district: 'Quận 1', status: 'safe', enabled: true },
  { id: '4', name: 'Phường Phạm Ngũ Lão', district: 'Quận 1', status: 'heavy_flood', enabled: true },
  { id: '5', name: 'Phường Đa Kao', district: 'Quận 1', status: 'light_flood', enabled: false }, // Disabled
  { id: '6', name: 'Phường Tân Định', district: 'Quận 1', status: 'safe', enabled: false },
  { id: '7', name: 'Phường Nguyễn Cư Trinh', district: 'Quận 1', status: 'safe', enabled: false },
  { id: '8', name: 'Phường Cầu Ông Lãnh', district: 'Quận 1', status: 'light_flood', enabled: false },
  { id: '9', name: 'Phường Cầu Kho', district: 'Quận 1', status: 'safe', enabled: false },
  { id: '10', name: 'Phường Cô Giang', district: 'Quận 1', status: 'safe', enabled: false },
  { id: '11', name: 'Phường Tân Định', district: 'Quận 1', status: 'safe', enabled: false },
];

export default function AdminWardsScreen() {
  const router = useRouter();
  const [wards, setWards] = useState(MOCK_WARDS);

  const toggleWard = (id: string) => {
    setWards(wards.map(ward => 
      ward.id === id ? { ...ward, enabled: !ward.enabled } : ward
    ));
  };

  const renderItem = ({ item }: any) => {
    let statusColor = '#0EA5E9';
    let statusBg = '#E0F2FE';
    let statusText = 'An toàn';

    if (item.status === 'heavy_flood') {
      statusColor = '#E11D48';
      statusBg = '#FFE4E6';
      statusText = 'Ngập nặng';
    } else if (item.status === 'light_flood') {
      statusColor = '#F59E0B';
      statusBg = '#FEF3C7';
      statusText = 'Ngập nhẹ';
    }

    return (
      <View style={[styles.wardCard, !item.enabled && styles.cardDisabled]}>
        <View style={styles.cardInfo}>
          <Text style={[styles.wardName, !item.enabled && styles.textDisabled]}>
            {item.name}
          </Text>
          <Text style={styles.wardDistrict}>{item.district}</Text>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>
            {item.enabled ? 'Hiển thị (Enable)' : 'Đã ẩn (Disable)'}
          </Text>
          <Switch
            trackColor={{ false: '#CBD5E1', true: '#0EA5E9' }}
            thumbColor={item.enabled ? '#FFFFFF' : '#F8FAFC'}
            ios_backgroundColor="#CBD5E1"
            onValueChange={() => toggleWard(item.id)}
            value={item.enabled}
          />
        </View>
      </View>
    );
  };

  const heavyFloodedCount = wards.filter(w => w.status === 'heavy_flood').length;
  const lightFloodedCount = wards.filter(w => w.status === 'light_flood').length;
  const enabledCount = wards.filter(w => w.enabled).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Phường</Text>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
           Tổng số phường: {wards.length}
        </Text>
        <Text style={styles.summaryText}>
           Đang hiển thị: {enabledCount} | Ngập nặng: {heavyFloodedCount} | Ngập nhẹ: {lightFloodedCount}
        </Text>
        <Text style={styles.infoNote}>
          Ghi chú: Vd Quận 1 có 11 phường, nhưng chỉ 4 phường ngập lụt thì disable các phường còn lại. Trên màn hình mobile citizen sẽ chỉ thấy các phường enable.
        </Text>
      </View>

      <FlatList
        data={wards}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
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
  summaryContainer: {
    padding: 20,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
  },
  summaryText: {
    color: '#0F172A',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoNote: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  listContainer: {
    padding: 16,
  },
  wardCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  cardInfo: {
    flex: 1,
  },
  wardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  textDisabled: {
    color: '#94A3B8',
  },
  wardDistrict: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  switchContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  switchLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 8,
  },
});
