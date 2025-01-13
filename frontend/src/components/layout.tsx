import * as React from "react"
import { Link, useLocation } from 'react-router-dom'
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { ScrollArea } from "./ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet"
import { useTheme } from "./theme-provider"
import { CalendarDays, Home, ListTodo, Menu, Moon, Heart, Sun, User } from 'lucide-react'
import { useAuth } from '../context/AuthProvider'
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import BuyMeCoffee from './buy-me-a-coffee'

// Utility function for conditional class names
const cn = (...classes: string[]) => classes.filter(Boolean).join(' ')

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { title: "Daily Items", href: "/", icon: <Home className="mr-2 h-4 w-4" /> },
  { title: "All Items", href: "/all", icon: <ListTodo className="mr-2 h-4 w-4" /> },
  { title: "Operation Hours", href: "/hours", icon: <CalendarDays className="mr-2 h-4 w-4" /> },
]

const preferences: NavItem = {
  title: "Your Favorites",
  href: "/preferences",
  icon: <Heart className="mr-2 h-4 w-4" />,
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const { token } = useAuth()

  const loggedIn = !!token

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop */}
      <aside className="hidden lg:flex w-56 flex-col bg-background">
        <div className="flex h-14 items-center border-b px-4">
          <Link to="/" className="flex items-center font-semibold">
            NUFood
          </Link>
        </div>
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-1 px-1 py-2">
            {navItems.map((item, index) => (
              <Link
                key={index}
                to={item.href}
                className={cn(
                  "flex items-center rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-accent",
                  location.pathname === item.href ? "bg-accent" : "transparent"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
            {loggedIn &&
              <Link
                key={"preferences"}
                to={preferences.href}
                className={cn(
                  "flex items-center rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-accent",
                  location.pathname === preferences.href ? "bg-accent" : "transparent"
                )}
              >
                {preferences.icon}
                {preferences.title}
              </Link>
            }
          </nav>
        </ScrollArea>
        <div className="border-t p-4 space-y-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                Account
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                {loggedIn ?
                  <Link to="/signout" className="w-full" onClick={() => setOpen(false)}>Sign Out</Link>
                  : <Link to="/login" className="w-full" onClick={() => setOpen(false)}>Login</Link>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <BuyMeCoffee className="w-full" />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetTitle className="hidden">
              <VisuallyHidden.Root>x</VisuallyHidden.Root>
            </SheetTitle>
            <SheetContent side="left" className="w-56 p-0">
              <nav className="flex flex-col gap-1 px-1 py-2">
                {navItems.map((item, index) => (
                  <Link
                    key={index}
                    to={item.href}
                    className={cn(
                      "flex items-center rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-accent",
                      location.pathname === item.href ? "bg-accent" : "transparent"
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {item.icon}
                    {item.title}
                  </Link>
                ))}
                {loggedIn && (
                  <Link
                    key={"preferences"}
                    to={preferences.href}
                    className={cn(
                      "flex items-center rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-accent",
                      location.pathname === preferences.href ? "bg-accent" : "transparent"
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {preferences.icon}
                    {preferences.title}
                  </Link>
                )}
              </nav>
              <div className="border-t p-4 mt-auto space-y-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <User className="mr-2 h-4 w-4" />
                      Account
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      {loggedIn ? (
                        <Link to="/signout" className="w-full" onClick={() => setOpen(false)}>
                          Sign Out
                        </Link>
                      ) : (
                        <Link to="/login" className="w-full" onClick={() => setOpen(false)}>
                          Login
                        </Link>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <BuyMeCoffee className="w-full" />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">
              {navItems.find(item => item.href === location.pathname)?.title
                || (preferences.href === location.pathname ? preferences.title : "Dashboard")}
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

