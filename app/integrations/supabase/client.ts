import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://axonckrcmrqlcsuhqxaa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4b25ja3JjbXJxbGNzdWhxeGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2Mzg5MzQsImV4cCI6MjA3ODIxNDkzNH0.v-HR1SrCJg50fpB6n2y9ULZmOapaVxVM_NS99r4BIpA";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
