import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, TextInput, Platform, KeyboardAvoidingView, FlatList, Keyboard, ActivityIndicator, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, Callout, UrlTile } from 'react-native-maps';
import { apiService } from '@/services/apiService';
import { supabase, supabase2 } from '@/services/supabaseService';

const PulsingMarker = ({ color, isBlinking }: { color: string, isBlinking: boolean }) => {
  const animValue = useRef(new RNAnimated.Value(0)).current;

  React.useEffect(() => {
    if (isBlinking) {
      const animation = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(animValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          RNAnimated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      animValue.setValue(0);
    }
  }, [isBlinking]);

  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5]
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0]
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 80, height: 80 }}>
      {isBlinking && (
        <RNAnimated.View 
          style={{
            position: 'absolute',
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: color,
            transform: [{ scale }],
            opacity: opacity,
          }} 
        />
      )}
      <View style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: '#FFF',
      }} />
    </View>
  );
};

export default function MapScreen() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [showRoute, setShowRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | null>(null);
  const [showForecastPanel, setShowForecastPanel] = useState(false);
  const [showRoutingPanel, setShowRoutingPanel] = useState(true);
  const mapRef = useRef<MapView>(null);
  const [primaryRoute, setPrimaryRoute] = useState<{latitude: number, longitude: number}[]>([]);
  const [altRoute, setAltRoute] = useState<{latitude: number, longitude: number}[]>([]);
  const [originCoords, setOriginCoords] = useState<any>(null);
  const [destinationCoords, setDestinationCoords] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [forecastReport, setForecastReport] = useState<any>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  const decodePolyline = (str: string, precision?: number) => {
    let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision || 5);
    while (index < str.length) {
        byte = null; shift = 0; result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        shift = result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += latitude_change; lng += longitude_change;
        coordinates.push({ latitude: lat / factor, longitude: lng / factor });
    }
    return coordinates;
  };

  React.useEffect(() => {
    fetchSensors();
    
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      Location.watchPositionAsync(
         { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
         (loc) => {}
      );
    })();

    const subscription = supabase2
      .channel('sensor-changes-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensorreadings' }, payload => {
        fetchSensors();
      })
      .subscribe();

    return () => {
      supabase2.removeChannel(subscription);
    };
  }, []);

  React.useEffect(() => {
    if (!activeInput) {
      setSuggestions([]);
      return;
    }

    const text = activeInput === 'origin' ? origin : destination;

    if (!text || text.length === 0) {
      // 1. Tải lịch sử tìm kiếm khi chưa nhập gì
      (async () => {
        try {
          setSearching(true);
          const { data: locData, error: locErr } = await supabase
            .from('locations')
            .select('*')
            // Cố gắng sắp xếp theo place_id để lấy danh sách mới nhất
            .order('place_id', { ascending: false })
            .limit(5);

          if (!locErr && locData) {
            const localItems = locData.map(loc => ({
              title: loc.title,
              address: loc.address,
              lat: loc.latitude,
              lng: loc.longitude,
              place_id: loc.place_id || Math.random().toString(),
              is_local: true,
              is_history: true
            })).filter(item => item.lat && item.lng);
            
            // Xóa trùng lặp theo title
            const unique: any[] = [];
            const seenTitles = new Set();
            for (const item of localItems) {
              const t = item.title?.trim().toLowerCase();
              if (t && !seenTitles.has(t)) {
                seenTitles.add(t);
                unique.push(item);
              }
            }
            
            setSuggestions(unique);
          }
        } catch (e) {
          console.warn('Lỗi lấy lịch sử:', e);
        } finally {
          setSearching(false);
        }
      })();
      return;
    }

    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearching(true);
        
        // 1. Tìm kiếm trong CSDL ưu tiên (các địa điểm đã lưu/lịch sử)
        let localItems: any[] = [];
        try {
          const { data: locData, error: locErr } = await supabase
            .from('locations')
            .select('*')
            .or(`title.ilike.%${text}%,address.ilike.%${text}%`)
            .limit(5);
            
          if (!locErr && locData) {
            localItems = locData.map(loc => ({
              title: loc.title,
              address: loc.address,
              lat: loc.latitude,
              lng: loc.longitude,
              place_id: loc.place_id || Math.random().toString(),
              is_local: true
            }));
          }
        } catch (e) {
          console.warn('Lỗi lấy địa điểm ưu tiên:', e);
        }

        // 2. Tìm kiếm qua API SerpApi
        const res = await apiService.get(`/Maps/search-map?Query=${encodeURIComponent(text)}&Lat=10.7769&Lng=106.7009`);
        let apiItems = res?.items || [];

        // 3. Khử trùng lặp và gộp kết quả
        const merged = [...localItems, ...apiItems];
        const unique: any[] = [];
        const seenTitles = new Set();
        for (const item of merged) {
          const t = item.title?.trim().toLowerCase();
          if (t && !seenTitles.has(t)) {
            seenTitles.add(t);
            unique.push(item);
          }
        }
        
        setSuggestions(unique);
      } catch (err) {
        console.warn('Autocomplete err', err);
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [origin, destination, activeInput]);

  const fetchSensors = async () => {
    try {
      // 1. Phải lấy thông tin cảm biến từ hệ thống 1 (supabase)
      const { data: sensorsData, error: sErr } = await supabase.from('sensors').select('*, locations(*)').limit(100);
      if (sErr) throw sErr;
      
      // 2. Phải lấy lịch sử đo đạc từ hệ thống 2 (supabase2)
      const { data: readingsData, error: rErr } = await supabase2
        .from('sensorreadings')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(200);

      if (sensorsData) {
        const mapped = sensorsData.map((s: any) => {
          const sensorId = s.SensorId || s.sensor_id;
          const readings = readingsData ? readingsData.filter((r: any) => (r.sensor_id === sensorId || r.SensorId === sensorId)) : [];
          
          let latestReading = null;
          if (readings.length > 0) {
            latestReading = readings[0]; // Do đã order DESC từ server
          }
          
          let status = 'safe';
          let level = latestReading?.water_level_cm || latestReading?.WaterLevelCm || 0;
          let danger = s.DangerThreshold || s.danger_threshold || 50;
          let warning = s.WarningThreshold || s.warning_threshold || 20;

          if (level >= danger) status = 'heavy_flood';
          else if (level >= warning) status = 'light_flood';
          
          return {
            id: sensorId,
            name: s.SensorName || s.sensorname || 'Cảm biến',
            lat: s.locations?.Latitude || s.locations?.latitude || s.locations?.lat,
            lng: s.locations?.Longitude || s.locations?.longitude || s.locations?.lng,
            status: status,
            enabled: true 
          };
        }).filter((s: any) => parseFloat(s.lat) && parseFloat(s.lng));
        setAreas(mapped);
      }
    } catch (err: any) {
      console.warn('Failed to fetch sensors from Supabase:', err.message);
    }
  };

  const fetchLatestReport = async () => {
    try {
      const { data, error } = await supabase2
        .from('report')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        setForecastReport(data[0]);
      }
    } catch (err) {
      console.warn('Lỗi lấy dữ liệu dự báo:', err);
    }
  };

  const runForecast = async () => {
    try {
      setIsForecasting(true);
      const lat = originCoords?.lat || 10.7769;
      const lng = originCoords?.lng || 106.7009;
      await apiService.post('/citizen/flood-forecast/run', { latitude: lat, longitude: lng });
      // Đợi backend xử lý và lưu vào db
      setTimeout(() => {
        fetchLatestReport();
        setIsForecasting(false);
      }, 2500);
    } catch (error: any) {
      alert('Lỗi kích hoạt dự báo: ' + (error.data ? JSON.stringify(error.data) : error.message));
      setIsForecasting(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Cần cấp quyền vị trí để sử dụng tính năng này!');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setOriginCoords({lat: loc.coords.latitude, lng: loc.coords.longitude});
      setOrigin('Vị trí hiện tại');
    } catch (e) {
      alert('Không thể lấy vị trí hiện tại');
    }
  };

  const toggleRoute = async () => {
    if (showRoute) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowRoute(false);
      setRouteInfo(null);
      setPrimaryRoute([]);
      setAltRoute([]);
      return;
    }

    if (!origin.trim() || !destination.trim()) {
      alert('Vui lòng nhập điểm đi và kết thúc!');
      return;
    }

    let startPoint = originCoords;
    let endPoint = destinationCoords;

    if (!startPoint) {
       try {
         const res = await apiService.get(`/Maps/search-map?Query=${encodeURIComponent(origin)}&Lat=10.7769&Lng=106.7009`);
         if (res && res.items && res.items.length > 0 && res.items[0].lat) {
            startPoint = { lat: res.items[0].lat, lng: res.items[0].lng };
            setOriginCoords(startPoint);
            setOrigin(res.items[0].title || res.items[0].address || origin);
         }
       } catch (e) {
         console.warn(e);
       }
    }

    if (!endPoint) {
       try {
         const res = await apiService.get(`/Maps/search-map?Query=${encodeURIComponent(destination)}&Lat=10.7769&Lng=106.7009`);
         if (res && res.items && res.items.length > 0 && res.items[0].lat) {
            endPoint = { lat: res.items[0].lat, lng: res.items[0].lng };
            setDestinationCoords(endPoint);
            setDestination(res.items[0].title || res.items[0].address || destination);
         }
       } catch (e) {
         console.warn(e);
       }
    }

    if (!startPoint || !endPoint) {
      alert('Không nhận diện được địa chỉ, vui lòng gõ rõ hơn hoặc chọn từ danh sách gợi ý!');
      return;
    }

    // Reset old route data before fetching
    setShowRoute(false);
    setRouteInfo(null);
    setPrimaryRoute([]);
    setAltRoute([]);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const requestBody = {
        StartAddress: origin,
        StartLat: startPoint.lat,
        StartLng: startPoint.lng,
        EndAddress: destination,
        EndLat: endPoint.lat,
        EndLng: endPoint.lng,
        TravelMode: 'Driving',
        FloodRadiusMeters: 300
      };

      const resp = await apiService.post(`/Maps/route-avoid-flood`, requestBody);
      
      if (resp.recommendedRoute && resp.alternatives) {
        resp.alternatives = resp.alternatives.filter((alt: any) => alt.overviewPolylinePoints !== resp.recommendedRoute.overviewPolylinePoints);
      }
      
      setRouteInfo(resp);
      setShowRoute(true);
      setShowForecastPanel(true);
      runForecast();

      // Lưu lại lịch sử tìm kiếm vào bảng locations để đề xuất nhanh hơn cho lần sau
      try {
         const saveLocation = async (title: string, coords: any) => {
            if (!coords || !title || title === 'Vị trí hiện tại') return;
             // Kiểm tra xem đã có trong DB chưa
            const { data } = await supabase.from('locations').select('place_id').eq('latitude', coords.lat).eq('longitude', coords.lng).limit(1);
            if (!data || data.length === 0) {
               await supabase.from('locations').insert({
                 title: title.substring(0, 100),
                 address: 'Địa điểm đã tìm kiếm',
                 latitude: coords.lat,
                 longitude: coords.lng
               });
            }
         };
         await saveLocation(origin, startPoint);
         await saveLocation(destination, endPoint);
      } catch (e) {
         console.warn('Lỗi lưu lịch sử location:', e);
      }

      if (resp?.recommendedRoute?.overviewPolylinePoints) {
        if (resp.isRecommendedRouteFlooded && resp.recommendedWarnings && resp.recommendedWarnings.length > 0) {
          try {
            const warning = resp.recommendedWarnings[0];
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
            
            const insertPayload = {
              location_id: warning.sensorId || warning.SensorId,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              max_water_level: warning.waterLevelCm || warning.WaterLevelCm || 0,
              severity: warning.severity || warning.Severity || 'Warning',
              created_at: new Date().toISOString()
            };

            const { error: insertErr } = await supabase2.from('history').insert(insertPayload);
            if (insertErr) console.warn('Lỗi insert history Supabase:', insertErr);
          } catch (err) {
            console.warn('Lỗi execute lưu lịch sử:', err);
          }
        }

        const points = decodePolyline(resp.recommendedRoute.overviewPolylinePoints, 5);
        setPrimaryRoute(points);
        
        let altPoints: any[] = [];
        if (resp.isRecommendedRouteFlooded && resp.alternatives && resp.alternatives.length > 0) {
          altPoints = decodePolyline(resp.alternatives[0].overviewPolylinePoints, 5);
          setAltRoute(altPoints);
        } else {
          setAltRoute([]);
        }

        const coordsToFit = altPoints.length > 0 ? [...points, ...altPoints] : points;
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coordsToFit, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
        }, 500);
      }
    } catch (e: any) {
      alert('Không tìm được đường: ' + e.message);
    }
  };

  const findAlternative = () => {
    if (!routeInfo || !routeInfo.alternatives || routeInfo.alternatives.length === 0) {
      alert('Không có tuyến đường thay thế!');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const points = decodePolyline(routeInfo.alternatives[0].overviewPolylinePoints, 5);
    setPrimaryRoute(points);
    setAltRoute([]);
    setRouteInfo({
      ...routeInfo,
      recommendedRoute: routeInfo.alternatives[0],
      isRecommendedRouteFlooded: false,
      alternatives: []
    });
    setShowForecastPanel(true);
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
    }, 500);
  };

  const swapLocations = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOrigin(destination);
    setDestination(origin);
  };

  const mapWards = areas.length > 0 ? areas : [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.mapArea}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={false}
          initialRegion={{
            latitude: 10.7769,
            longitude: 106.7009,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <UrlTile
            urlTemplate="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maximumZ={19}
            flipY={false}
          />
          
          {mapWards.filter((w: any) => w.enabled).map((ward: any, index: number) => {
            let color = '#0EA5E9';
            let label = 'An toàn';
            if (ward.status === 'heavy_flood') {
              color = '#E11D48';
              label = 'Ngập nặng';
            } else if (ward.status === 'light_flood') {
              color = '#F59E0B';
              label = 'Ngập nhẹ';
            }

            return (
              <Marker
                key={index}
                coordinate={{ latitude: parseFloat(ward.lat), longitude: parseFloat(ward.lng) }}
                title={ward.name.split(' (')[0]}
                description={label}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <PulsingMarker color={color} isBlinking={ward.status === 'heavy_flood' || ward.status === 'light_flood'} />
              </Marker>
            );
          })}

          {primaryRoute.length > 0 && (
            <Polyline
              coordinates={primaryRoute}
              strokeColor={routeInfo?.isRecommendedRouteFlooded && altRoute.length > 0 ? "#E11D48" : "#0EA5E9"}
              strokeWidth={6}
              lineJoin="round"
              lineDashPattern={routeInfo?.isRecommendedRouteFlooded && altRoute.length > 0 ? [10, 10] : undefined}
            />
          )}

          {altRoute.length > 0 && (
            <Polyline
              tappable={true}
              onPress={findAlternative}
              coordinates={altRoute}
              strokeColor="#10B981"
              strokeWidth={7}
              lineJoin="round"
            />
          )}
        </MapView>
      </View>

      <SafeAreaView style={styles.controlsLayer} pointerEvents="box-none">
        
        <View style={styles.topBarContainer} pointerEvents="box-none">
          <TouchableOpacity 
            style={[styles.topBarButton, showForecastPanel && styles.topBarButtonActive]} 
            onPress={() => setShowForecastPanel(!showForecastPanel)}
          >
            <MaterialCommunityIcons name="weather-lightning-rainy" size={16} color={showForecastPanel ? "#fff" : "#0EA5E9"} />
            <Text style={[styles.topBarText, showForecastPanel && {color: '#fff'}]}>Dự báo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.topBarButton, showRoutingPanel && styles.topBarButtonActive]} 
            onPress={() => setShowRoutingPanel(!showRoutingPanel)}
          >
            <MaterialCommunityIcons name="directions" size={16} color={showRoutingPanel ? "#fff" : "#0EA5E9"} />
            <Text style={[styles.topBarText, showRoutingPanel && {color: '#fff'}]}>Tìm đường</Text>
          </TouchableOpacity>
        </View>

        {showForecastPanel && (
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.forecastWrapper}>
          <View style={styles.forecastPanel}>
            <View style={styles.forecastHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialCommunityIcons name="weather-lightning-rainy" size={20} color="#0EA5E9" />
                <Text style={styles.forecastTitle}>Dự Báo Ngập Lụt</Text>
              </View>
              <TouchableOpacity onPress={runForecast} disabled={isForecasting}>
                {isForecasting ? (
                  <ActivityIndicator size="small" color="#0EA5E9" />
                ) : (
                  <MaterialCommunityIcons name="refresh" size={20} color="#0EA5E9" />
                )}
              </TouchableOpacity>
            </View>
            
            {forecastReport ? (
              <View style={styles.forecastContent}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                   <View style={[styles.statusBadgeSm, { 
                     backgroundColor: forecastReport.forecast_risk_level === 'High' ? '#FFE4E6' : 
                                      forecastReport.forecast_risk_level === 'Medium' ? '#FEF3C7' : '#E0F2FE' 
                   }]}>
                     <Text style={[styles.statusTextSm, { 
                       color: forecastReport.forecast_risk_level === 'High' ? '#E11D48' : 
                              forecastReport.forecast_risk_level === 'Medium' ? '#F59E0B' : '#0EA5E9' 
                     }]}>
                       {forecastReport.forecast_risk_level === 'High' ? 'Ngập nặng' : 
                        forecastReport.forecast_risk_level === 'Medium' ? 'Ngập nhẹ' : 'An toàn'}
                     </Text>
                   </View>
                   <Text style={styles.forecastTime}>
                      {new Date(forecastReport.created_at).toLocaleString('vi-VN', {hour: '2-digit', minute: '2-digit'})}
                   </Text>
                </View>
                <Text style={styles.forecastDesc}>{forecastReport.description}</Text>
              </View>
            ) : (
              <View style={styles.forecastContent}>
                <Text style={styles.forecastDesc}>Chưa có dự báo. Nhấn làm mới để lấy dữ liệu tính toán mới nhất.</Text>
              </View>
            )}
          </View>
        </Animated.View>
        )}

        {showRoutingPanel && (
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.routingContainer}>
          <View style={styles.routingPanel}>
            
            <View style={styles.routingInputs}>
              <View style={styles.locationDots}>
                <View style={styles.originDot} />
                <View style={styles.dottedLine} />
                <MaterialCommunityIcons name="map-marker" size={16} color="#E11D48" />
              </View>

              <View style={styles.inputsWrapper}>
                <View style={[styles.inputBox, {flexDirection: 'row', alignItems: 'center'}]}>
                  <TextInput
                    style={[styles.inputText, {flex: 1}]}
                    placeholder="Vị trí của bạn"
                    placeholderTextColor="#94A3B8"
                    value={origin}
                    onChangeText={(text) => {
                      setOrigin(text);
                      setOriginCoords(null);
                    }}
                    onFocus={() => setActiveInput('origin')}
                  />
                  <TouchableOpacity onPress={useCurrentLocation} style={{padding: 4}}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#0EA5E9" />
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="Chọn điểm đến"
                    placeholderTextColor="#94A3B8"
                    value={destination}
                    onChangeText={(text) => {
                      setDestination(text);
                      setDestinationCoords(null);
                    }}
                    onFocus={() => setActiveInput('destination')}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.swapButton} onPress={swapLocations}>
                <MaterialCommunityIcons name="swap-vertical" size={24} color="#0EA5E9" />
              </TouchableOpacity>
            </View>

            {activeInput && (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Text style={styles.suggestionsTitle}>Gợi ý địa điểm</Text>
                  <TouchableOpacity 
                    style={{backgroundColor: '#0EA5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8}} 
                    onPress={() => { setActiveInput(null); Keyboard.dismiss(); }}
                  >
                    <Text style={{color: '#FFF', fontSize: 12, fontWeight: 'bold'}}>Đóng</Text>
                  </TouchableOpacity>
                </View>
                {searching ? (
                   <View style={{padding: 20, alignItems: 'center'}}><Text style={{color: '#94A3B8'}}>Đang tìm kiếm...</Text></View>
                ) : (
                <FlatList
                  data={suggestions}
                  keyExtractor={(item, idx) => item.place_id || idx.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => {
                        const name = item.title || item.address || '';
                        if (activeInput === 'origin') {
                          setOrigin(name);
                          if (item.lat) setOriginCoords({lat: item.lat, lng: item.lng});
                        } else {
                          setDestination(name);
                          if (item.lat) setDestinationCoords({lat: item.lat, lng: item.lng});
                        }
                        setActiveInput(null);
                        Keyboard.dismiss();
                      }}
                    >
                      <MaterialCommunityIcons name={item.is_history ? "history" : "map-marker-outline"} size={20} color={item.is_history ? "#0EA5E9" : "#94A3B8"} style={styles.suggestionIcon} />
                      <View style={{flex: 1}}>
                         <Text style={styles.suggestionText}>{item.title}</Text>
                         {item.address && <Text style={{fontSize: 12, color: '#64748B'}}>{item.address}</Text>}
                      </View>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 250 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
                )}
              </View>
            )}

            {!activeInput && (
              <>
                {showRoute && routeInfo && (
                  <View style={styles.statsCard}>
                    <View style={styles.statsRow}>
                      <MaterialCommunityIcons name="map-marker-distance" size={20} color="#64748B" />
                      <Text style={styles.statsText}>
                        {((routeInfo.recommendedRoute?.distanceMeters || 0) / 1000).toFixed(1)} km
                      </Text>
                      <View style={styles.verticalDivider} />
                      <MaterialCommunityIcons name="clock-outline" size={20} color="#64748B" />
                      <Text style={styles.statsText}>
                        {Math.floor((routeInfo.recommendedRoute?.durationSeconds || 0) / 60)} phút
                      </Text>
                    </View>
                    <Text style={[styles.statsStatus, { color: routeInfo.isRecommendedRouteFlooded ? '#E11D48' : '#10B981' }]}>
                      {routeInfo.isRecommendedRouteFlooded 
                          ? (routeInfo.alternatives?.length > 0 
                              ? 'Báo khu vực nước ngập cao, tôi sẽ chuyển bạn tuyến đường không ngập.' 
                              : 'Khu vực nước ngập cao, hiện không có tuyến đường thay thế!')
                          : 'Ok, tuyến đường không ngập.'}
                    </Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.findRouteButton}
                  onPress={toggleRoute}
                  activeOpacity={0.8}
                >
              <LinearGradient
                colors={['#0EA5E9', '#0284C7']}
                style={styles.findRouteGradient}
                start={{x: 0,y: 0}} end={{x:1, y:1}}
              >
                <MaterialCommunityIcons name={showRoute ? "close" : "directions"} size={20} color="#FFFFFF" />
                <Text style={[styles.findRouteText, { color: '#FFFFFF' }]}>
                  {showRoute ? 'Hủy tuyến đường' : 'Tìm Tuyến Đường An Toàn'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {routeInfo?.isRecommendedRouteFlooded && routeInfo?.alternatives && routeInfo.alternatives.length > 0 && (
              <TouchableOpacity 
                style={[styles.findRouteButton, { marginTop: 12 }]}
                onPress={findAlternative}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.findRouteGradient}
                  start={{x: 0,y: 0}} end={{x:1, y:1}}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={20} color="#FFFFFF" />
                  <Text style={[styles.findRouteText, { color: '#FFFFFF' }]}>
                    Tìm Tuyến Đường Khác
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

              </>
            )}

          </View>
        </Animated.View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapArea: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  controlsLayer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    justifyContent: 'flex-start',
  },
  routingContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  routingPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 10,
  },
  topBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
    justifyContent: 'flex-end',
  },
  topBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginLeft: 10,
  },
  topBarButtonActive: {
    backgroundColor: '#0EA5E9',
  },
  topBarText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0EA5E9',
  },
  routingInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationDots: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    marginRight: 12,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0EA5E9',
    marginBottom: 4,
  },
  dottedLine: {
    width: 2,
    height: 20,
    backgroundColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginBottom: 4,
  },
  inputsWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputBox: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  inputText: {
    fontSize: 16,
    color: '#0F172A',
  },
  swapButton: {
    padding: 12,
    marginLeft: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  findRouteButton: {
    width: '100%',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  findRouteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  findRouteText: {
    fontWeight: '800',
    color: '#0A192F',
    marginLeft: 8,
    fontSize: 16,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 15,
    color: '#0F172A',
  },
  customMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  statsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 6,
    marginRight: 12,
  },
  verticalDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
    marginRight: 12,
  },
  statsStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  forecastWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
    paddingTop: 8,
  },
  forecastPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forecastTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 6,
  },
  forecastContent: {
  },
  statusBadgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusTextSm: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  forecastTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  forecastDesc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
});
