import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import store from './store';
import App from './App';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import './styles/globals.css';

const mantineTheme = createTheme({
  fontFamily: 'Inter, -apple-system, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, monospace',
  primaryColor: 'blue',
  primaryShade: 5,
  defaultRadius: 'md',
  colors: {
    dark: ['#e2e8f0','#94a3b8','#64748b','#475569','#334155','#1e293b','#141c35','#0f1629','#0a0e1a','#050810'],
  },
  components: {
    TextInput: { defaultProps: { size: 'sm' } },
    Select: { defaultProps: { size: 'sm' } },
    Button: { defaultProps: { size: 'sm' } },
    Modal: { defaultProps: { zIndex: 2000 } },
    Drawer: { defaultProps: { zIndex: 2000 } },
    Popover: { defaultProps: { zIndex: 2100 } },
  },
});

/** Bridges the Redux theme state into MantineProvider's colorScheme. */
function ThemeWrapper() {
  const theme = useSelector(s => s.ui.theme);
  return (
    <MantineProvider theme={mantineTheme} colorScheme={theme} forceColorScheme={theme}>
      <ModalsProvider>
        <Notifications position="top-right" limit={5} />
        <App />
      </ModalsProvider>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeWrapper />
    </Provider>
  </React.StrictMode>
);

