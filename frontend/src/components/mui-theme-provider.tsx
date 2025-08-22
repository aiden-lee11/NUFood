import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { useTheme } from './theme-provider'

export function MyMUIThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const muiTheme = createTheme({
    palette: {
      mode: theme as 'light' | 'dark',
      background: {
        default: theme === 'dark' ? 'hsl(249, 22%, 12%)' : 'hsl(32, 57%, 95%)',
        paper: theme === 'dark' ? 'hsl(249, 15%, 15%)' : 'hsl(35, 100%, 98%)',
      },
      text: {
        primary: theme === 'dark' ? 'hsl(245, 50%, 91%)' : 'hsl(248, 19%, 40%)',
      },
    },
    components: {
      MuiAccordion: {
        styleOverrides: {
          root: {
            backgroundColor: theme === 'dark' ? 'hsl(249, 22%, 12%)' : 'hsl(32, 57%, 95%)',
            color: theme === 'dark' ? 'hsl(245, 50%, 91%)' : 'hsl(248, 19%, 40%)',
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
            backgroundColor: theme === 'dark' ? 'hsl(248, 25%, 18%)' : 'hsl(30, 32%, 92%)',
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            backgroundColor: theme === 'dark' ? 'hsl(248, 25%, 18%)' : 'hsl(30, 32%, 92%)',
          },
        },
      },
    },
  });

  return <MUIThemeProvider theme={muiTheme}>{children}</MUIThemeProvider>;
}

