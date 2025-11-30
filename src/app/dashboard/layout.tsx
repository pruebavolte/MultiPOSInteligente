"use client";

import { UserButton } from "@clerk/nextjs";
import Sidebar from "@/components/dashboard/sidebar";
import { UserSync } from "@/components/auth/user-sync";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleMainClick = () => {
        if (mobileMenuOpen) {
            setMobileMenuOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <UserSync />

            <Sidebar
                isCollapsed={isCollapsed}
                onToggle={() => setIsCollapsed(!isCollapsed)}
                mobileMenuOpen={mobileMenuOpen}
                onMobileMenuChange={setMobileMenuOpen}
            />

            <div
                className={`transition-all duration-300 ${
                    isCollapsed ? "lg:pl-20" : "lg:pl-64"
                }`}
                onClick={handleMainClick}
            >
                <header className="sticky top-0 z-40 w-full border-b bg-background">
                    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3 lg:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMobileMenuOpen(true);
                                }}
                                className="lg:hidden"
                            >
                                <Menu className="h-6 w-6" />
                            </Button>
                            <img src="/images/logo_salvadorx.png" alt="Logo SalvadoreX" className="h-8"/>
                        </div>
                        <div className="flex-1"></div>
                        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                            {isMounted && <UserButton afterSignOutUrl="/" />}
                        </div>
                    </div>
                </header>

                <main className="w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
