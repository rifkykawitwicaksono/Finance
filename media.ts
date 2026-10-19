import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export async function pickAndUploadMedia() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
  if (result.canceled || !result.assets[0]) return;
  const asset = result.assets[0];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Silakan login kembali.');
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const ext = asset.fileName?.split('.').pop() ?? (asset.type === 'video' ? 'mp4' : 'jpg');
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('private-media').upload(path, blob, {
    contentType: asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'), upsert: false,
  });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from('messages').insert({ sender_id: user.id, media_path: path, media_type: asset.type ?? 'image' });
  if (error) throw error;
}

export async function getPrivateMediaUrl(path: string) {
  const { data, error } = await supabase.storage.from('private-media').createSignedUrl(path, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}
