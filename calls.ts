// WebRTC signalling starter. This requires a native development build, TURN credentials,
// and device testing. Do not treat this starter as production-ready emergency calling.
import { RTCPeerConnection, mediaDevices, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { supabase } from '@/lib/supabase';

const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
export async function createCallConnection(callId: string, onRemoteStream: (stream: any) => void) {
  const pc = new RTCPeerConnection(rtcConfig);
  const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  pc.ontrack = (event: any) => { if (event.streams?.[0]) onRemoteStream(event.streams[0]); };
  pc.onicecandidate = async (event: any) => {
    if (!event.candidate) return;
    await supabase.from('call_signals').insert({ call_id: callId, signal_type: 'candidate', payload: event.candidate.toJSON() });
  };
  const channel = supabase.channel(`call-signals-${callId}`).on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'call_signals', filter: `call_id=eq.${callId}`,
  }, async (payload: any) => {
    const signal = payload.new;
    if (signal.signal_type === 'answer' && signal.payload) await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
    if (signal.signal_type === 'offer' && signal.payload) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      await supabase.from('call_signals').insert({ call_id: callId, signal_type: 'answer', payload: answer });
    }
    if (signal.signal_type === 'candidate' && signal.payload) {
      try { await pc.addIceCandidate(new RTCIceCandidate(signal.payload)); } catch { /* candidate can arrive before remote description */ }
    }
  }).subscribe();
  return {
    pc, localStream: stream,
    async makeOffer() {
      const offer = await pc.createOffer({}); await pc.setLocalDescription(offer);
      const { error } = await supabase.from('call_signals').insert({ call_id: callId, signal_type: 'offer', payload: offer });
      if (error) throw error;
    },
    async close() {
      stream.getTracks().forEach(track => track.stop()); pc.close(); await supabase.removeChannel(channel);
    },
  };
}
