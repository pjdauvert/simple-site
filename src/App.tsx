import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppThemeProvider } from './features/theme/ThemeProvider';
import { AppIntlProvider } from './features/i18n/IntlProvider';
import { router } from './router';

const App: React.FC = () => {
  return (
    <AppIntlProvider>
      <AppThemeProvider>
        <RouterProvider router={router} />
      </AppThemeProvider>
    </AppIntlProvider>
  );
};

export default App;
