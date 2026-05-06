#!/bin/sh
# Generates config.js from Vercel environment variables at build time.
# SUPABASE_URL and SUPABASE_ANON_KEY must be set in the Vercel project settings.
cat > config.js <<EOF
window.SUPABASE_URL="${SUPABASE_URL}";
window.SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}";
EOF
echo "config.js generated."
