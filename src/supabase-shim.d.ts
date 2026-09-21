// TS 4.5's node10 resolution can't read supabase-js's `.d.cts` typings. Our
// usage is a couple of `.rpc()` calls, so an ambient `any` module is fine.
// ponytail: drop this and use real types once TS is on node16/bundler resolution.
declare module "@supabase/supabase-js";
