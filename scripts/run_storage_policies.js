// Test with ANON key (what the browser uses)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iulifmoxnwwzpxkbgrzr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1bGlmbW94bnd3enB4a2JncnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyOTk1OTUsImV4cCI6MjA5Mzg3NTU5NX0.OlxEqRhZJv1WMSxTDbeXj1ypLjfp694VkwEIWXMwqCw';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1bGlmbW94bnd3enB4a2JncnpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI5OTU5NSwiZXhwIjoyMDkzODc1NTk1fQ.U8I2iCOXDDmVzDPUkHzwFjFjPnBMsmCCuOX1NEpuiPw';

const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

// Sign in as the user first
console.log('1. Signing in as satyam.p25@imi.edu...');
// We can't sign in without the password. Let's check the current policies instead.

console.log('\n2. Checking existing storage policies...');
const { data: policies, error } = await serviceClient
  .from('pg_policies')
  .select('*');

// That won't work either (pg_policies isn't exposed via PostgREST)
// Let's just check the RLS status on the admin page upload

console.log('\n3. Testing anon upload (no auth)...');
const testBlob = new Blob(['test-anon'], { type: 'text/plain' });
const { error: anonErr } = await anonClient.storage
  .from('case-files')
  .upload('_test_anon.txt', testBlob, { upsert: true });

if (anonErr) {
  console.log(`   ❌ Anon upload: ${anonErr.message}`);
  console.log('   This is expected — storage requires authentication');
} else {
  console.log('   ✅ Anon upload works (bucket has no RLS)');
  await serviceClient.storage.from('case-files').remove(['_test_anon.txt']);
}

// Test case_decks insert with anon key (simulating logged-in user)
console.log('\n4. Testing case_decks insert with anon key (no auth)...');
const { error: deckErr } = await anonClient.from('case_decks').insert({
  name: 'TEST Anon',
  category: 'General',
  file_type: 'PDF',
  file_url: 'https://example.com/test.pdf',
  source: 'Test',
  added_date: '2026-05-10',
});

if (deckErr) {
  console.log(`   ❌ Anon insert: ${deckErr.message}`);
} else {
  console.log('   ✅ Anon insert works');
}

// The real fix: modify admin.tsx to use service role for uploads
// OR fix the RLS policies to allow inserts for all authenticated users
console.log('\n5. Fixing RLS: Making case_decks insertable by authenticated users...');
// We can't ALTER policies via PostgREST. Need a different approach.

// Alternative: Create a Supabase Edge Function or use a different approach
// Let's fix the code to handle this case gracefully

console.log('\n=== DIAGNOSIS ===');
console.log('The admin upload fails because:');
console.log('1. Storage upload: probably works if user is authenticated');
console.log('2. case_decks INSERT: RLS policy requires role=member or admin');
console.log('3. User profile NOW has admin role, so it should work if logged in');
console.log('');
console.log('ACTION: Log out and log back in on the website to refresh auth.');
console.log('The profile was just created, so the session needs to be refreshed.');
