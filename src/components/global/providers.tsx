"use client";

import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/nextjs";

interface Props {
    children: React.ReactNode;
}

const client = new QueryClient();

const Providers = ({ children }: Props) => {
    return (
        <ClerkProvider>
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        </ClerkProvider>
    );
};

export default Providers
