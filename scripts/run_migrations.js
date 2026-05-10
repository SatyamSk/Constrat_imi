import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iulifmoxnwwzpxkbgrzr.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1bGlmbW94bnd3enB4a2JncnpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI5OTU5NSwiZXhwIjoyMDkzODc1NTk1fQ.U8I2iCOXDDmVzDPUkHzwFjFjPnBMsmCCuOX1NEpuiPw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const USER_ID = 'd4fc9f4e-b02c-454a-b0ed-f505042b0855';
const USER_EMAIL = 'satyam.p25@imi.edu';

// 1. Create admin profile
console.log('1. Creating admin profile...');
const { error: profileErr } = await supabase.from('profiles').upsert({
  id: USER_ID,
  email: USER_EMAIL,
  full_name: 'Satyam',
  role: 'admin',
  batch: '2025',
  section: '',
  is_verified: true,
}, { onConflict: 'id' });

if (profileErr) {
  console.log('   ❌ Profile error:', profileErr.message);
} else {
  console.log('   ✅ Profile created with admin role');
}

// 2. Verify profile
const { data: profile } = await supabase.from('profiles').select('*').eq('id', USER_ID).single();
console.log('   Profile:', profile);

// 3. Create storage policies via SQL (service role can do this)
// The storage bucket is public for reads, but we need upload policies
console.log('\n2. Setting up storage policies...');

// Try to create policies - if they already exist, it'll error (which is fine)
const policySQLs = [
  `CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'case-files');`,
  `CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = 'case-files');`,
  `CREATE POLICY "Allow authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'case-files');`,
];

for (const sql of policySQLs) {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      if (error.message?.includes('already exists')) {
        console.log('   ⚠️ Policy already exists (OK)');
      } else {
        console.log('   ❌ SQL error:', error.message);
      }
    } else {
      console.log('   ✅ Storage policy created');
    }
  } catch (e) {
    console.log('   ⚠️ Cannot create via RPC, need SQL Editor');
  }
}

console.log('\n3. If storage policies failed above, run this in Supabase SQL Editor:');
console.log(`
-- Storage policies for case-files bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'case-files');

CREATE POLICY "Allow public read" ON storage.objects 
  FOR SELECT USING (bucket_id = 'case-files');

CREATE POLICY "Allow authenticated delete" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'case-files');
`);

console.log('\n✅ Done! Your profile is now admin. Try uploading again.');
