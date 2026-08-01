import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://clkrxppzrjhelnvcnobh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gfPjmzxqzqbV8NwbDA-CJA_4H14kuFd';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
