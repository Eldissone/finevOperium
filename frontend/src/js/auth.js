import '../index.css';
import { apiFetch } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const errorMsg = document.getElementById('error-msg');

  function showError(message) {
    if (!errorMsg) return;
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
          }),
        });
        window.location.href = '/src/page/dashboard.html';
      } catch (err) {
        showError(err.message || 'Falha ao autenticar');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            organizationName: document.getElementById('organization')?.value,
          }),
        });
        window.location.href = '/src/page/login.html';
      } catch (err) {
        showError(err.message || 'Falha ao registar');
      }
    });
  }
});
