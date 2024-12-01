// App.tsx
import { Routes, Route } from 'react-router-dom';
import MyNavbar from './components/myNavbar';
import DailyItems from './pages/DailyItems';
import Login from './firebase/login';
import SignOutButton from './firebase/signout';
import AllItems from './pages/AllItems';
import Preferences from './pages/Preferences';
import MyPicks from './pages/MyPicks';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
});

function App() {
  return (
    // TODO color scheme the theme to the projects colors and not mui defaults
    <ThemeProvider theme={theme}>
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
    </ThemeProvider>
  );
}


export default App;
