import React from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, LogIn } from 'lucide-react'

interface AuthPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthPopup: React.FC<AuthPopupProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#1a1d24] text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Not Signed In</DialogTitle>
          <DialogDescription className="text-gray-400">
            You need to log in to add this item to your favorites.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center space-x-4 mt-6">
          <Button variant="outline" onClick={onClose} className="bg-transparent border-gray-600 text-white hover:bg-gray-700 hover:text-white transition-colors duration-200">
            <X className="w-4 h-4 mr-2" />
            Dismiss
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200">
            <Link to="/login">
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthPopup;

