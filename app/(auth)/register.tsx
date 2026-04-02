import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password || !phone || isLoading) return;
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await register(name, email, password, phone);
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

      {/* Futuristic Background Glows */}
      <View style={[styles.glowOrb, { top: -50, right: -50, backgroundColor: '#0EA5E920' }]} />
      <View style={[styles.glowOrb, { bottom: -100, left: -100, backgroundColor: '#F59E0B15' }]} />

      <View style={styles.content}>
        <Animated.View 
          entering={FadeInUp.duration(1000).springify()} 
          style={styles.headerContainer}
        >
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.title}>Đăng Ký</Text>
          <Text style={styles.subtitle}>Gia nhập mạng lưới FloodGuard</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(1200).springify().delay(200)}>
          <View style={styles.glassCard}>
            
            <Text style={styles.inputLabel}>Họ và Tên</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Vd: Nguyễn Văn A"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={styles.inputLabel}>Tài khoản (Email)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="citizen@email.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Vd: 0987654321"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && { opacity: 0.7 }]} 
              onPress={handleRegister}
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
                  <Text style={styles.buttonText}>Tạo Tài Khoản</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => {
                Haptics.selectionAsync();
                router.push('/(auth)/login');
              }}>
                <Text style={styles.footerLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>

          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    filter: 'blur(50px)',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    zIndex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
    width: '100%',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 5,
    left: 0,
    padding: 8,
    zIndex: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#0EA5E9',
    letterSpacing: 1,
    marginTop: 8,
    fontWeight: '500',
  },
  glassCard: {
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  inputLabel: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    padding: 16,
    color: '#0F172A',
    fontSize: 16,
  },
  button: {
    marginTop: 36,
    borderRadius: 16,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonGradient: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  footerLink: {
    color: '#0EA5E9',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
