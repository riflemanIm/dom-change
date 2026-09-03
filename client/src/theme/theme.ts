import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: '#176B5B', dark: '#0E4A3F', light: '#56A593' },
    secondary: { main: '#E8794A' },
    background: { default: '#F7F7F2', paper: '#FFFFFF' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'var(--font-onest), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 500, letterSpacing: '-0.045em' },
    h2: { fontWeight: 500, letterSpacing: '-0.035em' },
    h3: { fontWeight: 500, letterSpacing: '-0.03em' },
    h4: { fontWeight: 500, letterSpacing: '-0.025em' },
    h5: { fontWeight: 500, letterSpacing: '-0.02em' },
    h6: { fontWeight: 500, letterSpacing: '-0.015em' },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 8, paddingInline: 22 } } },
    MuiCard: { styleOverrides: { root: { boxShadow: '0 10px 32px rgba(31,50,45,.08)' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTypography: {
      styleOverrides: {
        root: {
          '&.MuiTypography-h1, &.MuiTypography-h2, &.MuiTypography-h3, &.MuiTypography-h4, &.MuiTypography-h5, &.MuiTypography-h6': {
            fontWeight: '500 !important',
          },
        },
      },
    },
  },
});
