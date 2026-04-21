import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nifqmjyntruhnglvbapb.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_2xaFpTpkqVxiOCX4hb2wxQ_Z-Htv6V0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
