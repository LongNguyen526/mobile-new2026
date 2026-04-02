import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { apiService } from '../services/apiService';

type UserRole = 'citizen' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmailOtp: (email: string, otp: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (id: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return; // Prevents "Attempted to navigate before mounting"
    if (isLoading) return;

    setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!user && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (user && inAuthGroup) {
        if (user.role === 'admin') {
           router.replace('/admin/dashboard');
        } else {
           router.replace('/(tabs)');
        }
      }
    }, 1);
  }, [user, segments, isLoading, rootNavigationState?.key]);

  const login = async (email: string, pass: string) => {
    try {
      const resp = await apiService.post(`/Auth/login`, { Email: email, Password: pass });
      
      if (resp && resp.token) {
        apiService.setToken(resp.token);
        
        let role: UserRole = 'citizen';
        try {
           const base64Url = resp.token.split('.')[1];
           const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
           const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
             return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
           }).join(''));
           const payload = JSON.parse(jsonPayload);

           let hasRole3 = false;
           let isAdmin = false;

           for (const key in payload) {
               const lowerKey = key.toLowerCase();
               const valStr = String(payload[key]).toLowerCase();
               
               if (lowerKey.includes('role')) {
                   if (valStr === '1' || valStr === '2' || valStr.includes('admin')) {
                       isAdmin = true;
                   }
                   if (valStr === '3' || valStr.includes('citizen')) {
                       hasRole3 = true;
                   }
               }
           }

           if (isAdmin) {
               throw new Error('Chỉ có người dân (Role ID 3) mới được đăng nhập trên ứng dụng di động.');
           }
           
           if (!hasRole3) {
               throw new Error('Chỉ có người dân (Role ID 3) mới được đăng nhập trên ứng dụng di động.');
           }
           
        } catch (e: any) {
           console.error("Auth validation failed", e);
           throw new Error(e.message || "Tài khoản không hợp lệ hoặc không có quyền truy cập.");
        }

        const loggedInUser: User = {
          id: Math.random().toString(),
          name: email.split('@')[0],
          email: email,
          role,
        };
        setUser(loggedInUser);
      } else {
        throw new Error("Không nhận được token từ server");
      }
    } catch (err: any) {
      alert("Đăng nhập thất bại: " + err.message);
      throw err;
    }
  };

  const register = async (name: string, email: string, pass: string, phone: string = '') => {
    try {
      const body: any = { FullName: name, Email: email, Password: pass };
      if (phone) body.PhoneNumber = phone;
      await apiService.post(`/Auth/register`, body);
      alert("Đăng ký thành công. Vui lòng đăng nhập.");
    } catch (err: any) {
      alert("Đăng ký thất bại: " + err.message);
      throw err;
    }
  };

  const verifyEmailOtp = async (email: string, otp: string) => {
    try {
      await apiService.post(`/Auth/verify-email-otp`, { Email: email, Otp: otp });
    } catch (err: any) {
      alert("Xác thực thất bại: " + err.message);
      throw err;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await apiService.post(`/Auth/forgot-password`, { Email: email });
      alert("Mã xác thực đã được gửi tới email của bạn.");
    } catch (err: any) {
      alert("Yêu cầu thất bại: " + err.message);
      throw err;
    }
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    try {
      await apiService.post(`/Auth/reset-password`, { Email: email, Otp: otp, NewPassword: newPassword });
      alert("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
    } catch (err: any) {
      alert("Đặt lại mật khẩu thất bại: " + err.message);
      throw err;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await apiService.post(`/Auth/change-password`, { OldPassword: oldPassword, NewPassword: newPassword });
      alert("Đổi mật khẩu thành công.");
    } catch (err: any) {
      alert("Đổi mật khẩu thất bại: " + err.message);
      throw err;
    }
  };

  const updateProfile = async (id: string, name: string) => {
    try {
      await apiService.put(`/Auth/profile/${encodeURIComponent(id)}`, { FullName: name });
      if (user) {
        setUser({ ...user, name });
      }
      alert("Cập nhật thông tin thành công.");
    } catch (err: any) {
      alert("Cập nhật thông tin thất bại: " + err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
       await apiService.post('/Auth/logout');
    } catch (e) {}
    apiService.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, verifyEmailOtp, forgotPassword, resetPassword, changePassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
