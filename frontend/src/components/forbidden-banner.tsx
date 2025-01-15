import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const Banner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const handleDismiss = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-yellow-800 dark:text-yellow-200">
            NUFood Unavailable
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <p className="text-center text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-4">
            NUFood is currently unavailable as we can no longer access the Dine on Campus data. We are actively working to resolve this issue and restore functionality.
          </p>
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700"
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Banner;

