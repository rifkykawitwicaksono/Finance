import { supabase } from '@/lib/supabase';

export type ChatMessage = {
  id: string; sender_id: string; body: string | null; media_path: string | null;
  media_type: string | null; created_at: string;
};

export async function loadMessages() {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(200);
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function sendText(body: string) {
  const text = body.trim();
  if (!text) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sesi login tidak ditemukan.');
  const { error } = await supabase.from('messages').insert({ sender_id: user.id, body: text, media_type: 'text' });
  if (error) throw error;
}

export function subscribeMessages(onChange: () => void) {
  const channel = supabase.channel('private-chat-messages').on('postgres_changes',
    { event: '*', schema: 'public', table: 'messages' }, onChange).subscribe();
  return () => { void supabase.removeChannel(channel); };
}
