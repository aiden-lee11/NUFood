import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider'
import { MyMUIThemeProvider } from './components/mui-theme-provider'
import Layout from './components/layout';
import DailyItems from './pages/DailyItems';
import Login from './firebase/login';
import SignOutButton from './firebase/signout';
import AllItems from './pages/AllItems';
import Preferences from './pages/Preferences';
import ReactGA from 'react-ga4';
import Banner from './components/banner';
import OperationHours from './pages/OperationHours';
import DataLoader from './components/data-loader';

function App() {
  ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);
  ReactGA.send({ hitType: 'pageview', page: '/' });

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <MyMUIThemeProvider>
        <Layout>
          <Banner />
          <DataLoader>
            <Routes>
              <Route path="/" element={<DailyItems />} />
              <Route path="/hours" element={<OperationHours />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signout" element={<SignOutButton />} />
              <Route path="/preferences" element={<Preferences />} />
              <Route path="/all" element={<AllItems />} />
            </Routes>
          </DataLoader>
        </Layout>
      </MyMUIThemeProvider>
    </ThemeProvider >
  );
}

export default App;

