import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Feature degrades gracefully when unconfigured (local dev without creds, tests).
export const isConfigured = Boolean(url && anonKey);

// Non-null only when configured; guard call sites with isConfigured.
export const supabase = isConfigured ? createClient(url, anonKey) : null;
