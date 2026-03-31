import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { forgotPassword, resetPassword } = useAuth();
  const router = useRouter();

  const handleSendOtp = async () => {
    if (!email || isLoading) return;
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await forgotPassword(email);
      setIsOtpSent(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword || isLoading) return;
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await resetPassword(email, otp, newPassword);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.glowOrb, { top: -50, right: -50, backgroundColor: '#0EA5E920' }]} />
      <View style={[styles.glowOrb, { bottom: -100, left: -100, backgroundColor: '#E11D4815' }]} />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Animated.View 
            entering={FadeInUp.duration(1000).springify()} 
            style={styles.headerContainer}
          >
            <Text style={styles.title}>Khôi Phục Mật Khẩu</Text>
            <Text style={styles.subtitle}>
              {!isOtpSent ? 'Vui lòng nhập email đăng ký' : 'Nhập mã OTP và mật khẩu mới'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(1200).springify().delay(200)}>
            <View style={styles.glassCard}>
              
              <Text style={styles.inputLabel}>Tài khoản (Email)</Text>
              <View style={[styles.inputWrapper, isOtpSent && styles.inputDisabled]}>
                <TextInput
                  style={styles.input}
                  placeholder="citizen@email.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isOtpSent}
                />
              </View>

              {isOtpSent && (
                <Animated.View entering={FadeInDown.duration(500)}>
                  <Text style={styles.inputLabel}>Nhập mã OTP</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="123456"
                      placeholderTextColor="#94A3B8"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>
                </Animated.View>
              )}

              <TouchableOpacity 
                style={[styles.button, isLoading && { opacity: 0.7 }]} 
                onPress={!isOtpSent ? handleSendOtp : handleResetPassword}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#0EA5E9', '#0284C7']}
                  start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {!isOtpSent ? 'Gửi mã xác nhận' : 'Cập nhật mật khẩu'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.footerContainer}>
                <TouchableOpacity onPress={() => {
                  Haptics.selectionAsync();
                  router.replace('/(auth)/login');
                }}>
                  <Text style={styles.footerLink}>Quay lại Đăng nhập</Text>
                </TouchableOpacity>
              </View>

            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flexGrow: 1, justifyContent: 'center' },
  glowOrb: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150, filter: 'blur(50px)',
  },
  content: {
    padding: 24, zIndex: 1,
  },
  headerContainer: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: 1, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#0EA5E9', letterSpacing: 1, marginTop: 12, fontWeight: '500', textAlign: 'center' },
  glassCard: {
    padding: 28, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05,
    shadowRadius: 20, elevation: 5,
  },
  inputLabel: {
    color: '#475569', fontSize: 13, marginBottom: 10, marginTop: 16,
    fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1,
  },
  inputWrapper: {
    borderRadius: 16, overflow: 'hidden', backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9', borderColor: 'transparent'
  },
  input: { padding: 16, color: '#0F172A', fontSize: 16 },
  button: {
    marginTop: 36, borderRadius: 16, shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  buttonGradient: { padding: 18, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  footerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerLink: { color: '#0EA5E9', fontWeight: 'bold', fontSize: 14 },
});
