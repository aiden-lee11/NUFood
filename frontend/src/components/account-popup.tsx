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
import { Link } from "react-router-dom"
import { Switch } from "@/components/ui/switch"
import { updateMailing } from "@/util/data"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AccountPopupProps {
  isOpen: boolean
  onClose: () => void
}

const AccountPopup: React.FC<AccountPopupProps> = ({ isOpen, onClose }) => {
  const { token, user } = useAuth()
  const loggedIn = !!token

  const handleSwitchChange = (checked: boolean) => {
    updateMailing(checked, token as string)
    setMailing(checked)
    sessionStorage.setItem("mailing", checked ? "true" : "false")
  }

  const [mailing, setMailing] = React.useState<boolean>(
    sessionStorage.getItem("mailing") == "true"
  )

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
            <Button asChild variant="destructive" className="w-full">
              <Link to="/signout" onClick={onClose}>
                Sign Out
              </Link>
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link to="/login" onClick={onClose}>
                Sign In
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AccountPopup

