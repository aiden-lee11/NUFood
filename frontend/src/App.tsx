// App.tsx
import { Routes, Route } from 'react-router-dom';
import MyNavbar from './components/myNavbar';
import DailyItems from './pages/DailyItems';
import Login from './firebase/login';
import SignOutButton from './firebase/signout';
import AllItems from './pages/AllItems';
import Preferences from './pages/Preferences';
import MyPicks from './pages/MyPicks';

function App() {
  return (
    <MyNavbar>
      <Routes>
        <Route path="/" element={<DailyItems />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signout" element={<SignOutButton />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/all" element={<AllItems />} />
        <Route path="/mypicks" element={<MyPicks />} />
      </Routes>
    </MyNavbar>
  );
}


export default App;
