import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import GoogleButton from 'react-google-button';
import { auth } from '../firebase'; // Adjust the path if needed

export default function Login() {
  const navigate = useNavigate();
  const googleAuth = new GoogleAuthProvider();


  const login = async () => {
    try {

      if (!auth || !googleAuth) {
        throw new Error("Authentication or Google Auth is not initialized ");
      }

      const result = await signInWithPopup(auth, googleAuth);

      if (!result || !result.user) {
        throw new Error("Login failed: No user found");
      }

      localStorage.setItem('t', 'true');

      navigate("/");
    } catch (error) {
      console.error(error);
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">Welcome to NU Food Finder</h1>
        <p className="text-2xl text-white">Find out what's cooking at Northwestern</p>
      </div>

      <div className="p-12 rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-white mb-4">Enjoy your stay!</h2>
        </div>

        <div className="mb-10 flex justify-center">
          <img src="/images/NUDining.jpg" alt="NUDining" className="h-48 rounded-lg shadow-md" />
        </div>

        <div className="flex flex-col items-center">
          <GoogleButton
            onClick={login}
            style={{ width: '80%', height: '50px', borderRadius: '25px' }}
          />
        </div>
      </div>
    </div>
  );
};

