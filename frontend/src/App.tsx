// App.tsx
import { Routes, Route } from 'react-router-dom';
import MyNavbar from './components/myNavbar';
import DailyItems from './pages/DailyItems';
import Login from './firebase/login';
import SignOutButton from './firebase/signout';
import AllItems from './pages/AllItems';
import Preferences from './pages/Preferences';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ReactGA from 'react-ga4';
import Banner from './components/banner';
import OperationHours from './pages/OperationHours';

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
});

ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);
ReactGA.send({ hitType: 'pageview', page: '/' });

function App() {
  return (
    // TODO color scheme the theme to the projects colors and not mui defaults
    <ThemeProvider theme={theme}>
      <MyNavbar>
        <Banner />
        <Routes>
          <Route path="/" element={<DailyItems />} />
          <Route path="/hours" element={<OperationHours />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signout" element={<SignOutButton />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/all" element={<AllItems />} />
        </Routes>
      </MyNavbar>
    </ThemeProvider>
  );
}


export default App;
