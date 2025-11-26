import { supabaseAdmin } from "./server";
import type { Database } from "./client";

type User = Database['public']['Tables']['users']['Row'];

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}

export async function createUser(userData: {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  image?: string;
  role?: 'ADMIN' | 'USER' | 'CUSTOMER';
}): Promise<User> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("users")
    // @ts-expect-error - Type mismatch with Supabase generated types
    .insert({
      clerk_id: userData.clerkId,
      email: userData.email,
      first_name: userData.firstName,
      last_name: userData.lastName,
      image: userData.image,
      role: userData.role || 'USER'
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    throw error;
  }

  return data;
}

export async function updateUserRole(email: string, role: 'ADMIN' | 'USER' | 'CUSTOMER'): Promise<User> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("users")
    // @ts-expect-error - Type mismatch with Supabase generated types
    .update({ role })
    .eq("email", email)
    .select()
    .single();

  if (error) {
    console.error("Error updating user role:", error);
    throw error;
  }

  return data;
}

export async function getAllUsers(): Promise<User[]> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("users")
    .select("id, clerk_id, email, first_name, last_name, role, image, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    throw error;
  }

  return data;
}

export async function getOrCreateUser(clerkId: string, userData: {
  email: string;
  firstName: string;
  lastName: string;
  image?: string;
}): Promise<User> {
  let user = await getUserByClerkId(clerkId);

  if (!user) {
    user = await createUser({
      clerkId,
      ...userData
    });
  }

  return user;
}
