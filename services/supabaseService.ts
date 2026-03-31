import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Thông tin kết nối lấy từ Dashboard Supabase của bạn
const supabaseUrl = 'https://ixckoxqheegmeotthupx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4Y2tveHFoZWVnbWVvdHRodXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzYyOTksImV4cCI6MjA4MzkxMjI5OX0.zz0bVrN9I_KegOwrKfwfha-aHO-BmOASC92Pcdu_AqA'; // Dùng JWT Anon Key 

// Khởi tạo Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Prevents Expo Go 'Native module is null' AsyncStorage crash
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Db thứ 2
const supabase2Url = 'https://xprezcqbvcctvidrkonk.supabase.co';
const supabase2AnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcmV6Y3FidmNjdHZpZHJrb25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzY0ODgsImV4cCI6MjA4MzkxMjQ4OH0.7ykFYhrk-LmGhJK5dfSWKG97XY_rw288WA78dxTGxkE';

// Khởi tạo Supabase Client thứ 2
export const supabase2 = createClient(supabase2Url, supabase2AnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * Ví dụ cách lấy dữ liệu (fetch data) từ bảng:
 * 
 * export const fetchSensors = async () => {
 *   const { data, error } = await supabase
 *     .from('Sensors')
 *     .select('*');
 *     
 *   if (error) console.error('Lỗi lấy dữ liệu Supabase:', error);
 *   return data;
 * };
 */
