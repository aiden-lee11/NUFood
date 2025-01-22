
import type React from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface MailingSwitchProps {
  token: string
  updateMailing: (value: boolean, token: string) => void
  setOpen: (value: boolean) => void
}

const MailingSwitch: React.FC<MailingSwitchProps> = ({ token, updateMailing, setOpen }) => {
  const handleSwitchChange = (checked: boolean) => {
    setOpen(false)
    updateMailing(checked, token)
  }

  return (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between w-full">
        <Label
          htmlFor="mailing-switch"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Mailing List
        </Label>
        <Switch id="mailing-switch" onCheckedChange={handleSwitchChange} />
      </div>
    </DropdownMenuItem>
  )
}

export default MailingSwitch

