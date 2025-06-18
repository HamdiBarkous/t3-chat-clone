const { createClient } = require('@supabase/supabase-js');

// Use the same environment variables as the frontend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getAuthToken() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'hamdibarkous10@gmail.com',
      password: 'hamdi123',
    });

    if (error) {
      console.error('Authentication error:', error);
      return;
    }

    if (data.session) {
      console.log('Access Token:', data.session.access_token);
      return data.session.access_token;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

getAuthToken(); 