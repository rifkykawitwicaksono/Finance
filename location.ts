import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

export async function shareCurrentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Izin lokasi tidak diberikan.');
  const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Silakan login kembali.');
  const { error } = await supabase.from('location_shares').insert({
    sender_id: user.id, latitude: point.coords.latitude, longitude: point.coords.longitude,
    is_live: false, expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
  await supabase.from('messages').insert({ sender_id: user.id, body: 'Lokasi dibagikan (berlaku 1 jam).', media_type: 'location' });
}

// Live sharing must be started and stopped explicitly by the user.
export async function startLiveLocation(onPoint?: (lat: number, lng: number) => void) {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Izin lokasi tidak diberikan.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Silakan login kembali.');
  const { data, error } = await supabase.from('location_shares').insert({ sender_id: user.id, latitude: 0, longitude: 0, is_live: true, expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }).select('id').single();
  if (error) throw error;
  const shareId = data.id;
  const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 20 }, async (point) => {
    onPoint?.(point.coords.latitude, point.coords.longitude);
    await supabase.from('location_shares').update({ latitude: point.coords.latitude, longitude: point.coords.longitude, updated_at: new Date().toISOString() }).eq('id', shareId);
  });
  return async () => {
    subscription.remove();
    await supabase.from('location_shares').update({ is_live: false, expires_at: new Date().toISOString() }).eq('id', shareId);
  };
}
