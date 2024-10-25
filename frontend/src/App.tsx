// App.tsx
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Favorites from './pages/PickFavorites';
import MyNavbar from './components/myNavbar';
import DisplayFavorites from './pages/CurrentFavorites';
import DailyItems from './pages/DailyItems';
import Login from './firebase/login';
import SignOutButton from './firebase/signout';
import Scrape from './pages/HiddenScrape';

function App() {
  return (
    <MyNavbar>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signout" element={<SignOutButton />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/current" element={<DisplayFavorites />} />
        <Route path="/daily" element={<DailyItems />} />
        <Route path="/scrape" element={<Scrape />} />
      </Routes>
    </MyNavbar>
  );
}


export default App;
