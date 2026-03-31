import { createClient } from '@supabase/supabase-js';

const supabase2Url = 'https://xprezcqbvcctvidrkonk.supabase.co';
const supabase2AnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcmV6Y3FidmNjdHZpZHJrb25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzY0ODgsImV4cCI6MjA4MzkxMjQ4OH0.7ykFYhrk-LmGhJK5dfSWKG97XY_rw288WA78dxTGxkE';

const supabase2 = createClient(supabase2Url, supabase2AnonKey);

async function check() {
  const { data: h } = await supabase2.from('history').select('*').limit(1);
  console.log('HISTORY_JSON:', JSON.stringify(h, null, 2));
}

check();
