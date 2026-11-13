// ── Service keys ──────────────────────────────────────────────────────
// Both are public, client-side keys and safe to ship in the app:
// PostHog's project key only writes events, and Supabase's anon key is
// limited by the row-level security in supabase/schema.sql.
// Leave a value empty and that feature stays switched off.
window.EB_CONFIG = {
  posthog: {
    key: 'phc_tSsY4aLjapS3qE7P7rCx7SD3xZt4jFyqCeYq2qR7N4eb',   // Menu-fi org, EU project
    host: 'https://eu.i.posthog.com'    // or https://us.i.posthog.com
  },
  supabase: {
    url: 'https://jncvoaxdyqsvixwxjvvr.supabase.co',
    anonKey: 'sb_publishable_9hDBH_oyPlkkgIZSNGeJvQ_VOqRHEaW'   // publishable key (never the secret one)
  }
};
