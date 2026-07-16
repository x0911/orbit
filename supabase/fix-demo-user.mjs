#!/usr/bin/env node
/**
 * fix-demo-user.mjs
 *
 * One-time script to create or repair the Orbit demo user.
 *
 * Why this is needed:
 *   The seed.sql file inserts a hard-coded bcrypt hash for 'orbitdemo123'
 *   that is fabricated / invalid. Supabase Auth's internal bcrypt comparison
 *   crashes with a 500 error when it receives a malformed hash.
 *   This script uses the Admin API to set the password correctly.
 *
 * Usage:
 *   node supabase/fix-demo-user.mjs
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL  in .env.local
 *   - SUPABASE_SECRET_KEY       in .env.local  (service-role / secret key)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

// ── Load .env.local ───────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

let envVars = {};
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    envVars[key] = val;
  }
} catch {
  console.error("❌  Could not read .env.local — make sure it exists at the project root.");
  process.exit(1);
}

const SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const SECRET_KEY   = envVars["SUPABASE_SECRET_KEY"];

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

// ── Demo user config ──────────────────────────────────────────────────────────
const DEMO_EMAIL    = "demo@orbit.com";
const DEMO_PASSWORD = "orbitdemo123";
const DEMO_USER_ID  = "d0000000-0000-0000-0000-000000000000";

// ── Supabase Admin client ─────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔧  Orbit — Demo User Fix Script");
  console.log(`    Supabase URL : ${SUPABASE_URL}`);
  console.log(`    Demo email   : ${DEMO_EMAIL}\n`);

  // 1. Check if the demo user already exists by ID
  const { data: existingById, error: fetchError } =
    await supabase.auth.admin.getUserById(DEMO_USER_ID);

  if (fetchError && fetchError.status !== 404) {
    console.error("❌  Error checking for existing demo user:", fetchError.message);
    process.exit(1);
  }

  if (existingById?.user) {
    // User exists — update their password and confirm email
    console.log("ℹ️   Demo user already exists. Resetting password…");

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      DEMO_USER_ID,
      {
        password: DEMO_PASSWORD,
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error("❌  Failed to update demo user password:", updateError.message);
      process.exit(1);
    }

    console.log("✅  Demo user password reset successfully!");
  } else {
    // User doesn't exist — create them from scratch
    console.log("ℹ️   Demo user not found. Creating…");

    const { error: createError } = await supabase.auth.admin.createUser({
      // Note: Admin createUser doesn't accept a custom `id`.
      // If the profile row with the fixed UUID already exists from seed.sql,
      // we may need to update the profiles table after creation.
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: "demo_user",
        display_name: "Guest Demo",
      },
    });

    if (createError) {
      console.error("❌  Failed to create demo user:", createError.message);
      console.log("\n💡  Tip: If you see a 'User already registered' error, the user");
      console.log("    might exist with a different ID. Try running this in Supabase SQL:");
      console.log(`    SELECT id FROM auth.users WHERE email = '${DEMO_EMAIL}';`);
      console.log("    Then use that ID to manually update the password in the Auth dashboard.");
      process.exit(1);
    }

    console.log("✅  Demo user created successfully!");
    console.log("⚠️   Note: If using a fixed UUID (from seed.sql), you may need to");
    console.log("    manually update the profiles.id in Supabase SQL editor to match.");
  }

  // 2. Verify login works
  console.log("\n🔍  Verifying login…");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (signInError) {
    console.error("❌  Login verification failed:", signInError.message);
    process.exit(1);
  }

  console.log("✅  Login verified! User ID:", signInData.user?.id);
  console.log('\n🎉  Demo login is now working. Click "Try Guest Demo" in the app to test.\n');
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});
