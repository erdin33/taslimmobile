import { AppSidebar } from "@/components/navigation/app-sidebar"
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import React from "react"
import { Outlet } from "react-router-dom"

export default function Layout() {
    return (
        <SidebarProvider
            defaultOpen={false}
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
            className="h-svh overflow-hidden"
        >
            <AppSidebar />
            <SidebarInset className="h-svh overflow-hidden flex flex-col">
                <SiteHeader />
                <div className="flex-1 overflow-y-auto overscroll-none pb-16 md:pb-0">
                    <Outlet />
                </div>
                <MobileBottomNav />
            </SidebarInset>
        </SidebarProvider>
    )
}
