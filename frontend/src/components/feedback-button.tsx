import { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MessageSquare } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const FeedbackButton = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    emailjs.send(SERVICE_ID, TEMPLATE_ID, { message }, PUBLIC_KEY).then(
      (result) => {
        console.log('Email sent successfully:', result.text);
      },
      (error) => {
        console.error('Email failed to send:', error.text);
      }
    );

    setMessage('');
    setOpen(false);

    toast({
      title: "Feedback Sent",
      description: "Thank you for your feedback!",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <MessageSquare className="mr-2 h-4 w-4" />
          Send Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-center">
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Let us know if you encountered any issues or have suggestions for improvement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <div className="w-full max-w-sm py-4">
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full"
              placeholder="Your feedback here..."
              required
            />
          </div>
          <DialogFooter className="w-full flex justify-center">
            <Button type="submit" className="w-full max-w-sm">Send feedback</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackButton;

