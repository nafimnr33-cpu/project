import { authService } from '../lib/auth.js';
import { navigateTo } from '../lib/router.js';

export function LoginPage() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Login</h1>
        <form id="login-form" class="auth-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autocomplete="email"
              placeholder="Enter your email"
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autocomplete="current-password"
              placeholder="Enter your password"
            />
          </div>
          <div id="error-message" class="error-message"></div>
          <button type="submit" class="btn btn-primary">Login</button>
        </form>
        <div class="auth-links">
          <p>Don't have an account? <a href="/signup" data-link>Sign up</a></p>
        </div>
      </div>
    </div>
  `;
}

export function attachLoginListeners() {
  const form = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMessage.textContent = '';

      const email = form.email.value;
      const password = form.password.value;

      try {
        await authService.signIn(email, password);
        navigateTo('/');
      } catch (error) {
        errorMessage.textContent = error.message || 'Login failed';
      }
    });
  }
}
