import { supabase } from '../lib/supabase.js';
import { authService } from '../lib/auth.js';

export function BindDevicePage() {
  return `
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">Bind Device</h1>
        <p class="page-description">Enter the API key from your device to bind it to your account</p>
      </div>

      <div class="card">
        <form id="bind-device-form">
          <div class="form-group">
            <label class="form-label" for="api-key">Device API Key</label>
            <input
              type="text"
              id="api-key"
              name="api-key"
              class="form-input"
              required
              placeholder="Enter the 64-character API key from your device"
              pattern="[a-f0-9]{64}"
              title="API key must be 64 hexadecimal characters"
            />
            <small style="color: var(--text-secondary); display: block; margin-top: 0.5rem;">
              The API key is displayed when your device first connects or can be found in the device settings.
            </small>
          </div>

          <div class="form-group">
            <label class="form-label" for="project-select">Assign to Project</label>
            <select id="project-select" name="project" class="form-select" required>
              <option value="">Loading projects...</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="device-name">Device Name (optional)</label>
            <input
              type="text"
              id="device-name"
              name="device-name"
              class="form-input"
              placeholder="Give your device a friendly name"
            />
          </div>

          <div id="error-message" class="error-message"></div>
          <div id="success-message" style="padding: 0.75rem; background: #d1fae5; color: #065f46; border-radius: 6px; font-size: 0.875rem; margin-bottom: 1rem; display: none;"></div>

          <div class="actions">
            <button type="submit" class="btn btn-primary">Bind Device</button>
            <a href="/devices" class="btn btn-secondary" data-link>Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `;
}

export async function attachBindDeviceListeners() {
  const form = document.getElementById('bind-device-form');
  const errorMessage = document.getElementById('error-message');
  const successMessage = document.getElementById('success-message');
  const projectSelect = document.getElementById('project-select');

  await loadProjects();

  async function loadProjects() {
    try {
      const userId = authService.getUserId();
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      projectSelect.innerHTML = '<option value="">Select a project</option>';

      if (data.length === 0) {
        projectSelect.innerHTML = '<option value="">No projects available - create one first</option>';
      } else {
        data.forEach(project => {
          const option = document.createElement('option');
          option.value = project.id;
          option.textContent = project.name;
          projectSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      projectSelect.innerHTML = '<option value="">Error loading projects</option>';
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMessage.textContent = '';
      successMessage.style.display = 'none';

      const apiKey = form['api-key'].value.trim();
      const projectId = form['project'].value;
      const deviceName = form['device-name'].value.trim();

      if (!projectId) {
        errorMessage.textContent = 'Please select a project';
        return;
      }

      try {
        const userId = authService.getUserId();

        const { data: device, error: fetchError } = await supabase
          .from('devices')
          .select('*')
          .eq('api_key', apiKey)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!device) {
          errorMessage.textContent = 'Device not found. Please check the API key and try again.';
          return;
        }

        if (device.is_bound && device.user_id) {
          errorMessage.textContent = 'This device is already bound to an account.';
          return;
        }

        const updateData = {
          user_id: userId,
          project_id: projectId,
          is_bound: true,
          updated_at: new Date().toISOString()
        };

        if (deviceName) {
          updateData.name = deviceName;
        }

        const { error: updateError } = await supabase
          .from('devices')
          .update(updateData)
          .eq('id', device.id);

        if (updateError) throw updateError;

        successMessage.textContent = `Device "${device.name}" successfully bound to your account!`;
        successMessage.style.display = 'block';

        form.reset();

        setTimeout(() => {
          window.router.navigate('/devices');
        }, 2000);

      } catch (error) {
        console.error('Error binding device:', error);
        errorMessage.textContent = error.message || 'Failed to bind device';
      }
    });
  }
}
