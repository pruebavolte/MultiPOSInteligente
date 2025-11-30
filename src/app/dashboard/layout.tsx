"use client";

import { UserButton } from "@clerk/nextjs";
import Sidebar from "@/components/dashboard/sidebar";
import { UserSync } from "@/components/auth/user-sync";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const pathname = usePathname();
    const showSearchBar = pathname === "/dashboard/pos";

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
                    <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
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

                        {showSearchBar && (
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar por código de barras..."
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        className="pl-10 h-9"
                                        data-testid="input-header-search"
                                    />
                                </div>
                            </div>
                        )}

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
