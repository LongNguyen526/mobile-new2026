import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState(user?.name || '');
  const [editing, setEditing] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);

  const toggleEdit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (editing) {
      if (user && name !== user.name) {
        await updateProfile(user.id, name);
      }
      setEditing(false);
    } else {
      setEditing(true);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) return;
    try {
      await changePassword(oldPassword, newPassword);
      setModalVisible(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logout();
    router.replace('/(auth)/login');
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
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.8)' }]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          <Animated.View entering={FadeInUp.duration(800)} style={styles.header}>
            <Text style={styles.headerTitle}>Trang Cá Nhân</Text>
          </Animated.View>

          <Animated.View entering={ZoomIn.duration(1000).springify()} style={styles.avatarContainer}>
            <LinearGradient
              colors={['#0EA5E9', '#0284C7']}
              style={styles.avatarGradient}
              start={{x:0, y:0}} end={{x:1, y:1}}
            >
              <MaterialCommunityIcons name="account" size={60} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.emailText}>{user?.email || 'citizen@hcm.gov.vn'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'admin' ? 'Quản Trị Viên (Admin)' : 'Công Dân (Citizen)'}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(1000).delay(300)}>
            <View style={styles.infoSection}>
              
              <View style={styles.infoRowHeader}>
                <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
                <TouchableOpacity onPress={toggleEdit} style={styles.editButton}>
                  <MaterialCommunityIcons name={editing ? "check" : "pencil"} size={20} color="#0EA5E9" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Họ và tên</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, !editing && styles.inputDisabled]}
                    value={name}
                    onChangeText={setName}
                    editable={editing}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.changePasswordButton} 
                onPress={() => setModalVisible(true)}
              >
                <MaterialCommunityIcons name="lock-reset" size={20} color="#0EA5E9" />
                <Text style={styles.changePasswordText}>Đổi Mật Khẩu</Text>
              </TouchableOpacity>

              {user?.role === 'admin' && (
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/admin/dashboard');
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#0EA5E9', '#0284C7']}
                    start={{x:0, y:0}} end={{x:1, y:0}}
                    style={styles.adminButtonGradient}
                  >
                    <MaterialCommunityIcons name="shield-account" size={24} color="#FFFFFF" />
                    <Text style={styles.adminButtonText}>Trang Quản Trị Hệ Thống</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="logout" size={24} color="#E11D48" />
                <Text style={styles.logoutText}>Đăng xuất</Text>
              </TouchableOpacity>

            </View>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi Mật Khẩu</Text>
            
            <Text style={styles.label}>Mật khẩu hiện tại</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                secureTextEntry
                value={oldPassword}
                onChangeText={setOldPassword}
              />
            </View>

            <Text style={styles.label}>Mật khẩu mới</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword}>
                <Text style={styles.saveButtonText}>Cập Nhật</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    filter: 'blur(50px)',
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  emailText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  roleText: {
    fontSize: 12,
    color: '#0EA5E9',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoSection: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    overflow: 'hidden',
    shadowColor: '#0369A1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 5,
  },
  infoRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  editButton: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 32,
  },
  label: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  input: {
    padding: 16,
    color: '#0F172A',
    fontSize: 16,
  },
  inputDisabled: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    color: '#94A3B8',
  },
  adminButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 228, 230, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(253, 164, 175, 0.5)',
  },
  logoutText: {
    color: '#E11D48',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 8,
  },
  changePasswordText: {
    color: '#0EA5E9',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#0369A1',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#0EA5E9',
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
