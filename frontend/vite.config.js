import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'src/page/login.html'),
        register: resolve(__dirname, 'src/page/register.html'),
        dashboard: resolve(__dirname, 'src/page/dashboard.html'),
        appForm: resolve(__dirname, 'src/page/app-form.html'),
        appDashboard: resolve(__dirname, 'src/page/app-dashboard.html'),
        systemWizard: resolve(__dirname, 'src/page/system-wizard.html'),
        systemManage: resolve(__dirname, 'src/page/system-manage.html'),
        // upload and spreadsheet pages removed
      }
    }
  }
});
