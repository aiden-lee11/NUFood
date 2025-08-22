import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "../context/AuthProvider"
import { Switch } from "@/components/ui/switch"
import { updateMailing } from "@/util/data"
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth"
import { auth } from "../firebase"
import { FcGoogle } from "react-icons/fc"
import { LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useDataStore } from "../store"

interface AccountPopupProps {
  isOpen: boolean
  onClose: () => void
}

const AccountPopup: React.FC<AccountPopupProps> = ({ isOpen, onClose }) => {
  const { token, user } = useAuth()
  const loggedIn = !!token
  const { toast } = useToast()
  const [authLoading, setAuthLoading] = React.useState(false)
  const { resetFetchFlags } = useDataStore()

  const handleSwitchChange = (checked: boolean) => {
    updateMailing(checked, token as string)
    setMailing(checked)
    sessionStorage.setItem("mailing", checked ? "true" : "false")
  }

  const [mailing, setMailing] = React.useState<boolean>(
    sessionStorage.getItem("mailing") == "true"
  )

  const handleSignIn = async () => {
    setAuthLoading(true)
    try {
      const googleAuth = new GoogleAuthProvider()
      if (!auth || !googleAuth) {
        throw new Error("Authentication or Google Auth is not initialized")
      }

      const result = await signInWithPopup(auth, googleAuth)

      if (!result || !result.user) {
        throw new Error("Login failed: No user found")
      }

      toast({
        title: "Login Successful",
        description: "Welcome to NU Food Finder!",
      })
      
      // Reset fetch flags to allow refetching user-specific data
      resetFetchFlags()
      
      onClose()
    } catch (error) {
      console.error(error)
      toast({
        title: "Login Failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    setAuthLoading(true)
    try {
      // Remove user specific data from session storage
      sessionStorage.removeItem('userPreferences')
      sessionStorage.removeItem('availableFavorites')

      await signOut(auth)
      
      toast({
        title: "Signed Out Successfully",
        description: "We hope to see you again soon!",
      })
      
      onClose()
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Sign Out Failed",
        description: "An error occurred during sign out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] w-[95vw] p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl">{loggedIn ? "Account Information" : "Sign In"}</DialogTitle>
          <DialogDescription className="text-sm">
            {loggedIn ? "Manage your account settings and preferences." : "Get the best out of our app by signing in!"}
          </DialogDescription>
        </DialogHeader>
        {loggedIn ? (
          <div className="space-y-8 py-2">
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm">Email</Label>
              <p className="text-sm break-all text-right">{user?.email}</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">Notifications</Label>
                <Switch
                  id="mailing-switch"
                  onCheckedChange={handleSwitchChange}
                  checked={mailing}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Get emailed a list of where your favorites will be at the start of each day!
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6">
            <p className="text-sm text-center">Sign in to save your preferences, access your favorites, and more!</p>
          </div>
        )}
        <DialogFooter className="pt-2">
          {loggedIn ? (
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleSignOut}
              disabled={authLoading}
            >
              {authLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing out...
                </span>
              ) : (
                <span className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </span>
              )}
            </Button>
          ) : (
            <Button 
              className="w-full" 
              onClick={handleSignIn}
              disabled={authLoading}
            >
              {authLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center">
                  <FcGoogle className="mr-2 h-4 w-4" /> Sign in with Google
                </span>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AccountPopup

