import { createClient } from '@supabase/supabase-js';

// Kredensial Supabase Zona 9
const supabaseUrl = 'https://foyuidolkgrkbsooyswu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZveXVpZG9sa2dya2Jzb295c3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDk5MjYsImV4cCI6MjA4MzQyNTkyNn0.n1nc9kk5FM2iDS8FxTZS2gsQgPhPwJkXc_OA8GQ5EiI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);