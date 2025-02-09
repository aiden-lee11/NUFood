import type React from "react"
import { useState, useEffect, useRef } from "react"  // Add useRef
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import emailjs from "@emailjs/browser"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthProvider"

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const FeedbackButton = () => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sender, setSender] = useState("")
  const { toast } = useToast()
  const { token, user } = useAuth()
  const loggedIn = !!token

  const emailInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (loggedIn && user?.email) {
      setSender(user.email)
    }
  }, [loggedIn, user])

  useEffect(() => {
    if (open) {
      // Use a small timeout to ensure the dialog is fully rendered
      setTimeout(() => {
        if (loggedIn && messageInputRef.current) {
          messageInputRef.current.focus()
        } else if (!loggedIn && emailInputRef.current) {
          emailInputRef.current.focus()
        }
      }, 0)
    }
  }, [open, loggedIn])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    emailjs.send(SERVICE_ID, TEMPLATE_ID, { message, sender }, PUBLIC_KEY).then(
      (result) => {
        console.log("Email sent successfully:", result.text)
      },
      (error) => {
        console.error("Email failed to send:", error.text)
      },
    )
    setMessage("")
    setSender(loggedIn && user?.email ? user.email : "")
    setOpen(false)
    toast({
      title: "Feedback Sent",
      description: "Thank you for your feedback!",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <MessageSquare className="mr-2 h-4 w-4" />
          Send Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Let us know if you encountered any issues or have suggestions for improvement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email {!loggedIn && "(optional)"}</Label>
            <Input
              id="email"
              ref={emailInputRef}
              type="email"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder={loggedIn ? user?.email : "your.email@example.com"}
              required={loggedIn}
              readOnly={loggedIn}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Your Feedback</Label>
            <Textarea
              id="message"
              ref={messageInputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your feedback here..."
              className="min-h-[100px]"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full">
              Send feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default FeedbackButton
