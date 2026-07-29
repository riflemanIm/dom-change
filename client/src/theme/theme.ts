import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: '#176B5B', dark: '#0E4A3F', light: '#56A593' },
    secondary: { main: '#E8794A' },
    background: { default: '#F7F7F2', paper: '#FFFFFF' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 750, letterSpacing: '-0.04em' },
    h2: { fontWeight: 700, letterSpacing: '-0.025em' },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 999, paddingInline: 22 } } },
    MuiCard: { styleOverrides: { root: { boxShadow: '0 12px 40px rgba(31,50,45,.08)' } } },
  },
});
