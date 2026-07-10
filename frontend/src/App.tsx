import ReactGA from 'react-ga4';
import { Route, Routes } from 'react-router-dom';
import Banner from './components/banner';
import DataLoader from './components/data-loader';
import Layout from './components/layout';
import { MyMUIThemeProvider } from './components/mui-theme-provider';
import { ThemeProvider } from './components/theme-provider';
import { BannerProvider } from './context/BannerContext';
import AllItems from './pages/AllItems';
import NutrientPlanner from './pages/NutrientPlanner';
import DailyItems from './pages/DailyItems';
import OperationHours from './pages/OperationHours';
import Preferences from './pages/Preferences';

function App() {
  ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);
  ReactGA.send({ hitType: 'pageview', page: '/' });

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <MyMUIThemeProvider>
        <BannerProvider>
          <Layout>
            <Banner />
            <DataLoader>
              <Routes>
                <Route path="/" element={<DailyItems />} />
                <Route path="/hours" element={<OperationHours />} />
                <Route path="/preferences" element={<Preferences />} />
                <Route path="/all" element={<AllItems />} />
                <Route path="/planner" element={<NutrientPlanner />} />
              </Routes>
            </DataLoader>
          </Layout>
        </BannerProvider>
      </MyMUIThemeProvider>
    </ThemeProvider >
  );
}

export default App;

