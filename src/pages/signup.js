import { authService } from '../lib/auth.js';
import { navigateTo } from '../lib/router.js';

export function SignupPage() {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Sign Up</h1>
        <form id="signup-form" class="auth-form">
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
              autocomplete="new-password"
              placeholder="Enter your password (min 6 characters)"
              minlength="6"
            />
          </div>
          <div class="form-group">
            <label for="confirm-password">Confirm Password</label>
            <input
              type="password"
              id="confirm-password"
              name="confirm-password"
              required
              autocomplete="new-password"
              placeholder="Confirm your password"
              minlength="6"
            />
          </div>
          <div id="error-message" class="error-message"></div>
          <button type="submit" class="btn btn-primary">Sign Up</button>
        </form>
        <div class="auth-links">
          <p>Already have an account? <a href="/login" data-link>Login</a></p>
        </div>
      </div>
    </div>
  `;
}

export function attachSignupListeners() {
  const form = document.getElementById('signup-form');
  const errorMessage = document.getElementById('error-message');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMessage.textContent = '';

      const email = form.email.value;
      const password = form.password.value;
      const confirmPassword = form['confirm-password'].value;

      if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        return;
      }

      if (password.length < 6) {
        errorMessage.textContent = 'Password must be at least 6 characters';
        return;
      }

      try {
        await authService.signUp(email, password);
        navigateTo('/');
      } catch (error) {
        errorMessage.textContent = error.message || 'Sign up failed';
      }
    });
  }
}
