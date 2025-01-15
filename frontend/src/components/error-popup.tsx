import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle } from 'lucide-react'
import FeedbackButton from './feedback-button'

interface ErrorPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const ErrorPopup: React.FC<ErrorPopupProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Error Loading Data
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          We're having trouble loading the menu items. This could be due to a temporary issue with our data source. Please try again later or contact support if the problem persists.
        </DialogDescription>
        <div className="mt-4 flex justify-center">
          <FeedbackButton />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorPopup;

