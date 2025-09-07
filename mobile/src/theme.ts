import { useColorScheme } from 'react-native';

type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  muted: string;
};

const light: ThemeColors = {
  // From frontend/src/index.css (Rose Pine Dawn)
  background: '#faf4ed',
  foreground: '#4d4668',
  card: '#fffaf3',
  cardForeground: '#4d4668',
  border: '#ede0d3',
  primary: '#8b7ab8',
  primaryForeground: '#faf4ed',
  muted: '#726a85',
};

const dark: ThemeColors = {
  // From frontend/src/index.css (Rose Pine Main)
  background: '#191724',
  foreground: '#e6e3f7',
  card: '#24202f',
  cardForeground: '#e6e3f7',
  border: '#2d2a42',
  primary: '#ceadee',
  primaryForeground: '#191724',
  muted: '#9f9bb8',
};

export const useThemeColors = (): ThemeColors => {
  const scheme = useColorScheme();
  // Default to dark when unknown
  if (scheme === 'dark' || scheme == null) return dark;
  return light;
};


