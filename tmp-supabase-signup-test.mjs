import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sljlkpjikvlcooyzmuxt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsamxrcGppa3ZsY29veXptdXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTYxMjcsImV4cCI6MjA5ODA3MjEyN30.29sp_hx5DFKZuii3eucOCMiTuIC98vX5wbp1vBso9LU';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const email = 'test@example.com';
const password = 'Password123!';
console.log('calling signUp with:', email);
const response = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name: 'Test User',
      avatar_url: null,
    },
  },
});
console.log('response:', JSON.stringify(response, null, 2));
