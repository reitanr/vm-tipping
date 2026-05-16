import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lmjetzsqkmfszsifozdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtamV0enNxa21mc3pzaWZvemR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDk3OTMsImV4cCI6MjA5NDE4NTc5M30.qrSVwRKB5PaIehU4QTs9ictINwjpaeKSsUjEwiqCNPo'

export const supabase = createClient(supabaseUrl, supabaseKey)