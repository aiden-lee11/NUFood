import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { useTheme } from './theme-provider'

export function MyMUIThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const muiTheme = createTheme({
    palette: {
      mode: theme as 'light' | 'dark',
      background: {
        default: theme === 'dark' ? '#030711' : '#ffffff',
        paper: theme === 'dark' ? '#030711' : '#ffffff',
      },
      text: {
        primary: theme === 'dark' ? '#ffffff' : '#000000',
      },
    },
    components: {
      MuiAccordion: {
        styleOverrides: {
          root: {
            backgroundColor: theme === 'dark' ? '#030711' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#000000',
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
      },
      // #010307 – A very deep dark shade with a subtle blue-black tone.
      // #0A0F13 – A dark navy blue, almost black, with hints of blue.
      // #1A1D24 – A rich charcoal gray with a slight blue undertone.
      // #0A1016 – A deep dark slate blue.
      // #121820 – A deep black with hints of dark teal.
      // #2C2F38 – A dark grayish blue with a hint of green.
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            backgroundColor: theme === 'dark' ? '#010307' : '#f8f9fa',
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            backgroundColor: theme === 'dark' ? '#010307' : '#f8f9fa',
          },
        },
      },
    },
  });

  return <MUIThemeProvider theme={muiTheme}>{children}</MUIThemeProvider>;
}

