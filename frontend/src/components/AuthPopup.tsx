import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from 'lucide-react'
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "../firebase"
import { FcGoogle } from "react-icons/fc"
import { useToast } from "@/hooks/use-toast"
import { useDataStore } from "../store"

interface AuthPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthPopup: React.FC<AuthPopupProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast()
  const [authLoading, setAuthLoading] = React.useState(false)
  const { resetFetchFlags } = useDataStore()

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
          <Button 
            onClick={handleSignIn} 
            disabled={authLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
          >
            {authLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center">
                <FcGoogle className="w-4 h-4 mr-2" />
                Sign in with Google
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthPopup;

