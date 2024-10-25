import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { LogOut } from 'lucide-react'

const SignOutButton = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      // Remove user specific data from session storage
      sessionStorage.removeItem('userPreferences');
      sessionStorage.removeItem('availableFavorites');

      await signOut(auth);
      toast({
        title: "Signed Out Successfully",
        description: "We hope to see you again soon!",
      })
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign Out Failed",
        description: "An error occurred during sign out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#030711]">
      <Card className="w-full max-w-md bg-[#1a1d24] text-white border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Sign Out</CardTitle>
          <CardDescription className="text-gray-400 text-center">We're sad to see you go!</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">Are you sure you want to sign out?</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            onClick={handleSignOut}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing out...
              </span>
            ) : (
              <span className="flex items-center">
                <LogOut className="mr-2 h-5 w-5" /> Sign Out
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignOutButton;

