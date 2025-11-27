import { auth } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserByClerkId } from "@/lib/supabase/users";
import type { Database } from "@/lib/supabase/client";

type User = Database['public']['Tables']['users']['Row'];

const DEV_USER_EMAIL = "dev@salvadorex.test";
const DEV_USER_CLERK_ID = "dev_user_local";

function getDevSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function getDevUser(): Promise<User | null> {
  const supabase = getDevSupabaseClient();

  if (process.env.DEV_USER_ID) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", process.env.DEV_USER_ID)
      .single();

    if (!error && data) {
      return data;
    }
  }

  const { data: devUser, error: devError } = await supabase
    .from("users")
    .select("*")
    .eq("email", DEV_USER_EMAIL)
    .single();

  if (!devError && devUser) {
    return devUser;
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("users")
    .select("*")
    .eq("role", "ADMIN")
    .limit(1)
    .single();

  if (!adminError && adminUser) {
    return adminUser;
  }

  const { data: anyUser, error: anyError } = await supabase
    .from("users")
    .select("*")
    .limit(1)
    .single();

  if (!anyError && anyUser) {
    return anyUser;
  }

  return null;
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    console.log("[Auth] Development mode - bypassing Clerk authentication");
    const devUser = await getDevUser();
    if (devUser) {
      console.log(`[Auth] Using dev user: ${devUser.email} (${devUser.role})`);
    } else {
      console.warn("[Auth] No dev user found. Run /api/init-db?step=dev-user to create one.");
    }
    return devUser;
  }

  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("[Auth] No Clerk userId found");
      return null;
    }

    const userData = await getUserByClerkId(userId);
    
    if (!userData) {
      console.log(`[Auth] No user found for Clerk ID: ${userId}`);
      return null;
    }

    return userData;
  } catch (error) {
    console.error("[Auth] Error during Clerk authentication:", error);
    return null;
  }
}

export async function createDevUser(): Promise<User | null> {
  const supabase = getDevSupabaseClient();

  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("email", DEV_USER_EMAIL)
    .single();

  if (existingUser) {
    console.log("[Auth] Dev user already exists");
    return existingUser;
  }

  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      clerk_id: DEV_USER_CLERK_ID,
      email: DEV_USER_EMAIL,
      first_name: "Dev",
      last_name: "User",
      role: "ADMIN"
    } as any)
    .select()
    .single();

  if (error) {
    console.error("[Auth] Error creating dev user:", error);
    return null;
  }

  console.log("[Auth] Dev user created:", newUser.email);
  return newUser;
}

export function getSupabaseClient() {
  const isDevelopment = process.env.NODE_ENV === "development";
  if (isDevelopment) {
    return getDevSupabaseClient();
  }
  return supabaseAdmin;
}

export { DEV_USER_EMAIL, DEV_USER_CLERK_ID };
