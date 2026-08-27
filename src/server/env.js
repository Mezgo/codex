function getRequiredEnv(name, env = process.env) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadServerEnv(env = process.env) {
  return {
    supabaseUrl: getRequiredEnv("SUPABASE_URL", env),
    supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", env),
    aiRadarApiToken: getRequiredEnv("AI_RADAR_API_TOKEN", env)
  };
}

module.exports = {
  getRequiredEnv,
  loadServerEnv
};
