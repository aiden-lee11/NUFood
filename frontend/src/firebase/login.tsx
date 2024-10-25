import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from '../firebase';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FcGoogle } from "react-icons/fc";
import { useToast } from "@/hooks/use-toast"

export default function Login() {
  const navigate = useNavigate();
  const googleAuth = new GoogleAuthProvider();
  const { toast } = useToast();

  const login = async () => {
    try {
      if (!auth || !googleAuth) {
        throw new Error("Authentication or Google Auth is not initialized");
      }

      const result = await signInWithPopup(auth, googleAuth);

      if (!result || !result.user) {
        throw new Error("Login failed: No user found");
      }

      localStorage.setItem('t', 'true');
      toast({
        title: "Login Successful",
        description: "Welcome to NU Food Finder!",
      })
      navigate("/");
    } catch (error) {
      console.error(error);
      toast({
        title: "Login Failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      })
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#030711]">
      <Card className="w-full max-w-md bg-[#1a1d24] text-white border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold mb-2">Welcome to NU Food!</CardTitle>
          <CardDescription className="text-gray-400">Find out what's cooking at Northwestern</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex justify-center">
            <img src="/images/NUDining.jpg" alt="NUDining" className="h-40 rounded-lg shadow-md transition-transform duration-300 hover:scale-105" />
          </div>
          <Button
            onClick={login}
            className="w-full h-12 bg-white hover:bg-gray-100 text-black font-semibold transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            <FcGoogle className="mr-2 h-5 w-5" /> Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

