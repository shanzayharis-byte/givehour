import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cmiwwlfazbnrfsvakvhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaXd3bGZhemJucmZzdmFrdmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk0NTYyMywiZXhwIjoyMDkzNTIxNjIzfQ.l0naZsiK-AL6r7kB1EZL9W4mW5GfdQ0aCMy6BOp7bNg'
)

const { data, error } = await supabase
  .from('users')
  .update({ is_admin: true })
  .eq('email', 'shanzay.haris@gmail.com')
  .select('id, name, email, is_admin')

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

if (!data?.length) {
  console.log('No user found with email shanzay.haris@gmail.com — sign up first, then re-run.')
  process.exit(0)
}

console.log('Done! Admin row:', data[0])
