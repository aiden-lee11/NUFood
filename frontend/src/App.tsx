// App.tsx
import { Routes, Route } from 'react-router-dom';
import MyNavbar from './components/myNavbar';
import DailyItems from './pages/DailyItems';
import Login from './firebase/login';
import SignOutButton from './firebase/signout';
import AllItems from './pages/AllItems';
import Preferences from './pages/Preferences';
import AvailableFavorites from './pages/AvailableFavorites';

function App() {
  return (
    <MyNavbar>
      <Routes>
        <Route path="/" element={<DailyItems />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signout" element={<SignOutButton />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/all" element={<AllItems />} />
        <Route path="/available" element={<AvailableFavorites />} />
      </Routes>
    </MyNavbar>
  );
}


export default App;
