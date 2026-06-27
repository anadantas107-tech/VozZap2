import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados. Configure o arquivo .env.local para conectar ao Supabase.');
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const reportSupabaseError = (context: string, error: unknown) => {
  console.error(`[Supabase] ${context}`, error);
  return error;
};

export const isSupabaseUuid = (value?: string | null) => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

export const getSupabaseEnvStatus = () => ({
  hasUrl: Boolean(supabaseUrl),
  hasAnonKey: Boolean(supabaseAnonKey),
  isConfigured: isSupabaseConfigured,
});

export const mapSupabaseProfileToUser = (profile: any, user: any) => ({
  id: user?.id || profile?.id,
  name: profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário',
  email: profile?.email || user?.email || '',
  avatar: profile?.avatar_url || user?.user_metadata?.avatar_url,
  bio: profile?.bio || '',
  followersCount: 0,
  followingCount: 0,
  postsCount: 0,
  createdAt: profile?.created_at || user?.created_at || new Date().toISOString(),
  theme: 'dark' as const,
});

const createLocalPreviewUrl = (file: File | Blob) => {
  if (typeof window === 'undefined') return '';

  if (file instanceof Blob && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(file);
  }

  return '';
};

export const uploadSupabaseFile = async (file: File | Blob, bucket: 'audio-files' | 'covers' | 'avatars', userId: string) => {
  if (!supabase) {
    const fallbackUrl = createLocalPreviewUrl(file);
    if (fallbackUrl) return fallbackUrl;
    throw new Error('Supabase não configurado');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    reportSupabaseError('storage.getSession', sessionError);
  }

  if (!session?.access_token) {
    const fallbackUrl = createLocalPreviewUrl(file);
    if (fallbackUrl) {
      return fallbackUrl;
    }

    throw new Error('Sessão do Supabase não encontrada. Faça login novamente.');
  }

  const extension = file instanceof File ? file.name.split('.').pop() || 'bin' : 'bin';
  const path = `${bucket}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file instanceof File ? file.type || 'application/octet-stream' : 'application/octet-stream',
  });

  if (error) {
    reportSupabaseError('storage.upload', error);

    const fallbackUrl = createLocalPreviewUrl(file);
    if (fallbackUrl) {
      return fallbackUrl;
    }

    throw error;
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrlData.publicUrl;
};
