"use client";

import React from "react";

// STUB de Clerk (cliente) para modo PREVIEW: Clerk 100% fuera. No hace handshake ni network,
// así la página deja de "dar vueltas". Todo se comporta como sesión iniciada (usuario ficticio).

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function UserButton(_props: any) {
  return null;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedOut(_props: any) {
  return null;
}

export function SignInButton({ children }: { children?: React.ReactNode }) {
  return <>{children ?? null}</>;
}

const FAKE_USER: any = {
  id: "preview",
  fullName: "Preview Admin",
  firstName: "Preview",
  lastName: "Admin",
  imageUrl: "",
  primaryEmailAddress: { emailAddress: "preview@local.test" },
  emailAddresses: [{ emailAddress: "preview@local.test" }],
};

export function useUser(): any {
  return { isLoaded: true, isSignedIn: true, user: FAKE_USER };
}

export function useAuth(): any {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: "preview",
    sessionId: "preview",
    orgId: null,
    getToken: async () => null,
    signOut: async () => {},
  };
}

// Las páginas de login/signup ya no aplican: mandan directo al dashboard.
export function SignIn(_props: any) {
  if (typeof window !== "undefined") window.location.replace("/dashboard/pos");
  return null;
}

export function SignUp(_props: any) {
  if (typeof window !== "undefined") window.location.replace("/dashboard/pos");
  return null;
}
