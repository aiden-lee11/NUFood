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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{loggedIn ? "Account Information" : "Sign In"}</DialogTitle>
          <DialogDescription>
            {loggedIn ? "Manage your account settings and preferences." : "Get the best out of our app by signing in!"}
          </DialogDescription>
        </DialogHeader>
        {loggedIn ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <div className="col-span-3">
                <p className="text-sm">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mailing-switch" className="text-right">
                Mailing List
              </Label>
              <div className="col-span-3">
                <Switch id="mailing-switch" onCheckedChange={handleSwitchChange} checked={mailing} />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-center mb-4">
              Sign in to save your preferences, access your favorites, and more!
            </p>
          </div>
        )}
        <DialogFooter className="">
          {loggedIn ? (
            <Button asChild variant="destructive">
              <Link to="/signout" onClick={onClose}>
                Sign Out
              </Link>
            </Button>
          ) : (
            <Button asChild>
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

