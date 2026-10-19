import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ChatMessage, loadMessages, sendText, subscribeMessages } from '@/services/chat';
import { pickAndUploadMedia } from '@/services/media';
import { shareCurrentLocation } from '@/services/location';

const PINK = '#F5A9C8'; const INK = '#493744';
export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [phone, setPhone] = useState(''); const [otp, setOtp] = useState(''); const [otpSent, setOtpSent] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [draft, setDraft] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setBooting(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);
  async function refresh() { try { setMessages(await loadMessages()); } catch (e: any) { Alert.alert('Chat belum tersedia', e.message); } }
  useEffect(() => { if (!session) return; void refresh(); return subscribeMessages(() => { void refresh(); }); }, [session?.user.id]);
  async function requestOtp() {
    const normalized = phone.trim().replace(/[\s()-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) { Alert.alert('Format nomor', 'Gunakan format internasional, misalnya +6281234567890.'); return; }
    setBusy(true); const { error } = await supabase.auth.signInWithOtp({ phone: normalized }); setBusy(false);
    if (error) Alert.alert('Login gagal', error.message); else { setPhone(normalized); setOtpSent(true); Alert.alert('Kode dikirim', 'Masukkan kode OTP yang diterima melalui SMS.'); }
  }
  async function verifyOtp() {
    setBusy(true); const { error } = await supabase.auth.verifyOtp({ phone: phone.trim().replace(/[\s()-]/g, ''), token: otp.trim(), type: 'sms' }); setBusy(false);
    if (error) Alert.alert('Verifikasi gagal', error.message);
  }
  async function doSend() { try { await sendText(draft); setDraft(''); await refresh(); } catch (e: any) { Alert.alert('Pesan gagal dikirim', e.message); } }
  async function safeAction(action: () => Promise<unknown>) { try { setBusy(true); await action(); await refresh(); } catch (e: any) { Alert.alert('Tidak berhasil', e.message); } finally { setBusy(false); } }
  if (booting) return <View style={styles.center}><ActivityIndicator color={PINK} /></View>;
  if (!session) return <SafeAreaView style={styles.screen}><StatusBar style="dark" /><View style={styles.loginCard}>
    <Text style={styles.kicker}>RUANG KECIL KITA</Text><Text style={styles.logo}>Bubu <Text style={{color:PINK}}>&</Text> Dudu</Text>
    <Text style={styles.subtitle}>Tempat privat untuk dua orang saja.</Text>
    <Text style={styles.label}>Nomor telepon</Text><TextInput value={phone} onChangeText={setPhone} placeholder="+62..." keyboardType="phone-pad" autoCapitalize="none" style={styles.input} />
    {otpSent && <><Text style={styles.label}>Kode OTP</Text><TextInput value={otp} onChangeText={setOtp} placeholder="Masukkan kode SMS" keyboardType="number-pad" style={styles.input} /></>}
    <Pressable style={styles.primary} onPress={() => void (otpSent ? verifyOtp() : requestOtp())} disabled={busy}><Text style={styles.primaryText}>{busy ? 'Memproses…' : otpSent ? 'Verifikasi & masuk' : 'Kirim kode OTP'}</Text></Pressable>
    <Text style={styles.hint}>Login hanya berhasil jika nomor sudah dimasukkan ke daftar izin backend.</Text>
  </View></SafeAreaView>;
  return <SafeAreaView style={styles.screen}><StatusBar style="dark" /><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}><View><Text style={styles.kicker}>PRIVATE SPACE</Text><Text style={styles.headerTitle}>Bubu <Text style={{color:PINK}}>&</Text> Dudu</Text></View><Pressable onPress={() => void supabase.auth.signOut()}><Text style={styles.logout}>Keluar</Text></Pressable></View>
    <View style={styles.featureRow}><Pressable style={styles.feature} onPress={() => void safeAction(pickAndUploadMedia)}><Text style={styles.featureEmoji}>▧</Text><Text style={styles.featureText}>Foto/video</Text></Pressable><Pressable style={styles.feature} onPress={() => void safeAction(shareCurrentLocation)}><Text style={styles.featureEmoji}>⌖</Text><Text style={styles.featureText}>Lokasi</Text></Pressable><Pressable style={styles.feature} onPress={() => Alert.alert('Mini game', 'Papan mini game dua pemain disiapkan sebagai modul berikutnya; aktifkan tabel game_events pada backend.') }><Text style={styles.featureEmoji}>♡</Text><Text style={styles.featureText}>Mini game</Text></Pressable><Pressable style={styles.feature} onPress={() => Alert.alert('Panggilan', 'Panggilan WebRTC memerlukan konfigurasi TURN, UI panggilan, dan build native. Lihat README.') }><Text style={styles.featureEmoji}>◖</Text><Text style={styles.featureText}>Panggilan</Text></Pressable></View>
    <FlatList data={messages} keyExtractor={m => m.id} contentContainerStyle={styles.messages} ListEmptyComponent={<Text style={styles.empty}>Mulai percakapan kalian di sini.</Text>} renderItem={({item}) => <View style={[styles.bubble, item.sender_id === session.user.id ? styles.mine : styles.theirs]}>{item.body ? <Text style={styles.messageText}>{item.body}</Text> : <Text style={styles.messageText}>{item.media_type === 'location' ? '⌖ Lokasi dibagikan' : item.media_type === 'video' ? '▻ Video terlampir' : '▧ Media terlampir'}</Text>}<Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Text></View>} />
    <View style={styles.composer}><TextInput value={draft} onChangeText={setDraft} placeholder="Tulis pesan…" placeholderTextColor="#A99AA5" style={styles.composerInput} multiline /><Pressable style={styles.send} onPress={() => void doSend()}><Text style={styles.sendText}>➤</Text></Pressable></View>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles: any = {
  screen:{flex:1,backgroundColor:'#FFF8FA'},center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#FFF8FA'},loginCard:{margin:24,marginTop:80,padding:26,borderRadius:28,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#F7DFE9'},kicker:{fontSize:10,letterSpacing:2.4,color:'#A17C90',fontWeight:'800'},logo:{fontSize:34,fontWeight:'800',color:INK,marginTop:10},subtitle:{fontSize:14,color:'#8A7A85',marginTop:8,marginBottom:28},label:{fontSize:12,fontWeight:'700',color:INK,marginBottom:7,marginTop:10},input:{borderWidth:1,borderColor:'#F0DCE5',borderRadius:14,padding:14,color:INK,backgroundColor:'#FFFCFD'},primary:{backgroundColor:PINK,padding:15,borderRadius:14,alignItems:'center',marginTop:18},primaryText:{color:'#FFFFFF',fontWeight:'800'},hint:{fontSize:11,color:'#9A8993',lineHeight:17,marginTop:15},header:{paddingHorizontal:20,paddingTop:14,paddingBottom:15,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},headerTitle:{fontSize:25,fontWeight:'800',color:INK,marginTop:4},logout:{color:'#A17C90',fontWeight:'700',padding:8},featureRow:{flexDirection:'row',gap:8,paddingHorizontal:14,paddingBottom:12},feature:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:12,borderRadius:15,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#F5E3EB'},featureEmoji:{fontSize:20,color:'#D979A4',fontWeight:'700'},featureText:{fontSize:10,color:INK,marginTop:5,fontWeight:'700'},messages:{padding:16,gap:10,flexGrow:1},empty:{textAlign:'center',color:'#A99AA5',marginTop:40},bubble:{maxWidth:'82%',paddingHorizontal:13,paddingVertical:10,borderRadius:18},mine:{alignSelf:'flex-end',backgroundColor:'#FCE0EC',borderBottomRightRadius:5},theirs:{alignSelf:'flex-start',backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#F1E5EB',borderBottomLeftRadius:5},messageText:{fontSize:14,color:INK},time:{fontSize:9,color:'#9D8994',marginTop:5,textAlign:'right'},composer:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:14,paddingVertical:10,borderTopWidth:1,borderColor:'#F2E3EA',backgroundColor:'#FFFFFF'},composerInput:{flex:1,maxHeight:100,backgroundColor:'#FFF8FA',borderRadius:22,paddingHorizontal:16,paddingVertical:11,color:INK},send:{width:42,height:42,borderRadius:21,backgroundColor:PINK,alignItems:'center',justifyContent:'center'},sendText:{fontSize:20,color:'#FFFFFF',fontWeight:'800'}
};
