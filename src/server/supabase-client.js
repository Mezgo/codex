const { createClient } = require("@supabase/supabase-js");
const { loadServerEnv } = require("./env");

function createServerSupabaseClient(env = process.env) {
  const { supabaseUrl, supabaseServiceRoleKey } = loadServerEnv(env);
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

module.exports = {
  createServerSupabaseClient
};
