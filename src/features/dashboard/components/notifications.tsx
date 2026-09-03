"use client"

import * as React from "react"
import { Bell, Check, Info, AlertTriangle, XCircle } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import { useNavigate } from "react-router-dom"

import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  date: string
  isRead: boolean
  targetRole?: string
}

export function Notifications() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const navigate = useNavigate()
  
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<NotificationItem[]>([])
  const [filter, setFilter] = React.useState<"all" | "unread" | "read">("all")
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])
  
  const fetchNotifications = React.useCallback(async () => {
    try {
      const data = await invoke<NotificationItem[]>("get_notifications", { role: user?.role || "all" })
      
      // Auto-sync notifications for Admin from new requests
      if (isAdmin) {
        try {
          const res = await api.get("/requests")
          const requests = Array.isArray(res.data?.data || res.data) ? (res.data?.data || res.data) : []
          let hasNew = false
          
          for (const req of requests) {
            if (req.status?.toUpperCase() === "MENUNGGU") {
              const notifId = `req-${req.id}`
              const exists = data.some((n: NotificationItem) => n.id === notifId)
              
              if (!exists) {
                const newNotif = {
                  id: notifId,
                  title: "Request Material Baru",
                  message: `${req.requester?.profile?.nama || req.requester?.username || "Mitra"} mengajukan request sejumlah ${req.itemsCount || 0} item.`,
                  type: "info",
                  date: req.requestedAt || new Date().toISOString(),
                  isRead: false,
                  targetRole: "admin"
                }
                
                try {
                  await invoke("add_notification", { notification: newNotif })
                  hasNew = true
                } catch (err) {
                  // Ignore if already exists or fails
                }
              }
            }
          }
          
          if (hasNew) {
            const newData = await invoke<NotificationItem[]>("get_notifications", { role: user?.role || "all" })
            setItems(newData)
            return
          }
        } catch (e) {
          console.error("Failed to sync remote requests to notifications:", e)
        }
      }
      
      setItems(data)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }, [isAdmin])

  React.useEffect(() => {
    fetchNotifications()
    const interval = setInterval(() => {
      if (!document.hidden) fetchNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = items.filter((n) => !n.isRead).length

  const filteredItems = React.useMemo(() => {
    if (filter === "unread") return items.filter((item) => !item.isRead)
    if (filter === "read") return items.filter((item) => item.isRead)
    return items
  }, [items, filter])

  const markAllAsRead = async () => {
    try {
      await invoke("mark_all_notifications_read", { role: user?.role || "all" })
      fetchNotifications()
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await invoke("mark_notification_read", { id })
      fetchNotifications()
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    await markAsRead(notification.id)
    
    // Auto-navigate to the Request list page and pass reqId to open the drawer
    if (notification.id.startsWith("req-")) {
      const reqId = notification.id.replace("req-", "")
      navigate(`/request?reqId=${reqId}`)
      setOpen(false) // Close popover
    }
  }

  const getIconProps = (type: string) => {
    switch (type) {
      case "warning":
        return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" }
      case "success":
        return { icon: Check, color: "text-emerald-500", bg: "bg-emerald-500/10" }
      case "error":
        return { icon: XCircle, color: "text-red-600", bg: "bg-red-600/10" }
      case "info":
      default:
        return { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" }
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group rounded-full cursor-pointer">
          <Bell className="size-[1.15rem] text-muted-foreground transition-all group-hover:text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-background">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 md:w-[380px]" align={isMobile ? "center" : "end"} sideOffset={8} collisionPadding={16}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">Notifikasi</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {unreadCount} baru
              </span>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 border-b px-4 py-2 bg-muted/20">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer outline-none select-none",
              filter === "all" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer outline-none select-none",
              filter === "unread" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Belum Dibaca {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setFilter("read")}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer outline-none select-none",
              filter === "read" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Dibaca
          </button>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="flex flex-col gap-1 p-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-10 px-4 text-sm text-muted-foreground select-none">
                {filter === "unread" 
                  ? "Tidak ada notifikasi belum dibaca" 
                  : filter === "read" 
                    ? "Tidak ada notifikasi dibaca" 
                    : "Tidak ada notifikasi"}
              </div>
            ) : (
              filteredItems.map((notification) => {
                const { icon: Icon, color, bg } = getIconProps(notification.type)
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-3 text-left transition-all hover:bg-accent focus:bg-accent outline-none cursor-pointer",
                      !notification.isRead && "bg-muted/40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full mt-0.5",
                        bg,
                        color
                      )}
                    >
                      <Icon className="size-4.5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p
                        className={cn(
                          "text-sm leading-tight text-foreground",
                          !notification.isRead ? "font-semibold" : "font-medium"
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground/60 mt-1">
                        {formatTime(notification.date)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="ml-auto mt-1 flex size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
        {unreadCount > 0 && (
          <div className="border-t p-2">
            <Button 
              variant="ghost" 
              onClick={markAllAsRead}
              className="w-full text-xs font-medium text-muted-foreground hover:text-foreground h-9"
            >
              Tandai semua sudah dibaca
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
