import { auth, currentUser } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get the current user from the database with their role
 */
const AUTH_BYPASS = true; // preview: Clerk off en todo el app
const USER_SELECT = { id: true, email: true, firstName: true, lastName: true, role: true, image: true } as const;

export async function getCurrentUserWithRole() {
  // Sin Clerk: el "usuario actual" sale de NUESTRA BD; si la BD no vive (preview), usuario ficticio.
  if (AUTH_BYPASS) {
    try {
      if (process.env.DEV_USER_ID) {
        const byId = await prisma.user.findUnique({ where: { id: process.env.DEV_USER_ID }, select: USER_SELECT });
        if (byId) return byId;
      }
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: USER_SELECT });
      if (admin) return admin;
      const any = await prisma.user.findFirst({ select: USER_SELECT });
      if (any) return any;
    } catch (e) {
      console.warn("[auth] BD no disponible, usuario ficticio:", (e as Error)?.message);
    }
    return { id: "00000000-0000-0000-0000-000000000001", email: "preview@local.test", firstName: "Preview", lastName: "Admin", role: "ADMIN", image: null } as any;
  }

  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    select: USER_SELECT,
  });

  return user;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin() {
  const user = await getCurrentUserWithRole();
  return user?.role === "ADMIN";
}

/**
 * Check if a user is an admin by email
 */
export async function isAdminByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  return user?.role === "ADMIN";
}

/**
 * Get the current user's role
 */
export async function getUserRole() {
  const user = await getCurrentUserWithRole();
  return user?.role || "USER";
}

/**
 * Update a user's role by email
 */
export async function updateUserRole(email: string, role: "ADMIN" | "USER") {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role },
    });
    return { success: true, user };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "No se pudo actualizar el rol del usuario" };
  }
}

/**
 * Get all admin users
 */
export async function getAllAdmins() {
  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      image: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return admins;
}

/**
 * Get all users with their roles
 */
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      image: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users;
}
