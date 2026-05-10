import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmiwwlfazbnrfsvakvhh.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaXd3bGZhemJucmZzdmFrdmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk0NTYyMywiZXhwIjoyMDkzNTIxNjIzfQ.l0naZsiK-AL6r7kB1EZL9W4mW5GfdQ0aCMy6BOp7bNg';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ALTER_SQL = 'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false';

async function main() {
  // Step 1: Check if column already exists
  const { error: checkError } = await supabase
    .from('users')
    .select('is_admin')
    .limit(0);

  if (!checkError) {
    console.log('Column already exists');
    process.exit(0);
  }

  // Column doesn't exist (or some other error) — try to add it
  console.log('Column not found, attempting to add via RPC...');

  // Step 2a: Try exec_sql
  const { error: rpc1Error } = await supabase.rpc('exec_sql', { sql: ALTER_SQL });

  if (!rpc1Error) {
    console.log('Column added successfully via exec_sql RPC.');
    process.exit(0);
  }

  console.log(`exec_sql failed: ${rpc1Error.message}`);

  // Step 2b: Fallback to execute_sql
  const { error: rpc2Error } = await supabase.rpc('execute_sql', { query: ALTER_SQL });

  if (!rpc2Error) {
    console.log('Column added successfully via execute_sql RPC.');
    process.exit(0);
  }

  console.log(`execute_sql failed: ${rpc2Error.message}`);

  // Both RPCs failed
  console.log(
    'MANUAL STEP REQUIRED: Run this SQL in your Supabase SQL editor: ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;'
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
