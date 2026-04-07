const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ixckoxqheegmeotthupx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4Y2tveHFoZWVnbWVvdHRodXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzYyOTksImV4cCI6MjA4MzkxMjI5OX0.zz0bVrN9I_KegOwrKfwfha-aHO-BmOASC92Pcdu_AqA'; 

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabase2Url = 'https://xprezcqbvcctvidrkonk.supabase.co';
const supabase2AnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcmV6Y3FidmNjdHZpZHJrb25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzY0ODgsImV4cCI6MjA4MzkxMjQ4OH0.7ykFYhrk-LmGhJK5dfSWKG97XY_rw288WA78dxTGxkE';
const supabase2 = createClient(supabase2Url, supabase2AnonKey);

async function run() {
  const { data: sensorsData, error: sErr } = await supabase.from('sensors').select('*, locations(*)').limit(1);
  console.log("Sensors keys:", JSON.stringify(sensorsData?.[0]));

  const { data: historyData, error: hErr } = await supabase2.from('history').select('*').limit(1);
  console.log("History keys:", JSON.stringify(historyData?.[0]));
}

run();
