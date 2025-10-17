import { supabase } from '../lib/supabase.js';
import { renderWaterPumpDashboard } from './water-pump.js';
import { renderSmartLightDashboard } from './smart-light.js';

export async function renderProjectDetail(params) {
  const projectId = params.get('id');

  if (!projectId) {
    window.router.navigate('/projects');
    return;
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !project) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="navbar">
        <div class="navbar-container">
          <a href="/" class="navbar-brand">IoT Dashboard</a>
          <ul class="navbar-nav">
            <li><a href="/" class="nav-link">Home</a></li>
            <li><a href="/firmware" class="nav-link">Firmware</a></li>
            <li><a href="/devices" class="nav-link">Devices</a></li>
            <li><a href="/projects" class="nav-link active">Projects</a></li>
          </ul>
        </div>
      </div>
      <div class="container">
        <div class="empty-state">Project not found</div>
      </div>
    `;
    return;
  }

  switch (project.project_type) {
    case 'water_pump':
      await renderWaterPumpDashboard(project);
      break;
    case 'smart_light':
      await renderSmartLightDashboard(project);
      break;
    default:
      await renderGenericProjectDashboard(project);
  }
}

async function renderGenericProjectDashboard(project) {
  const app = document.getElementById('app');

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('project_id', project.project_id)
    .order('updated_at', { ascending: false });

  app.innerHTML = `
    <div class="navbar">
      <div class="navbar-container">
        <a href="/" class="navbar-brand">IoT Dashboard</a>
        <ul class="navbar-nav">
          <li><a href="/" class="nav-link">Home</a></li>
          <li><a href="/firmware" class="nav-link">Firmware</a></li>
          <li><a href="/devices" class="nav-link">Devices</a></li>
          <li><a href="/projects" class="nav-link active">Projects</a></li>
        </ul>
      </div>
    </div>

    <div class="container">
      <div class="page-header">
        <h1 class="page-title">${project.project_name}</h1>
        <p class="page-description">
          <span class="badge badge-info">${project.project_type}</span>
          <span style="margin-left: 1rem; color: var(--text-secondary);">${project.project_id}</span>
        </p>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 class="card-title" style="margin: 0;">Devices</h2>
          <button class="btn btn-primary" onclick="showAddDeviceModal('${project.project_id}')">Add Device</button>
        </div>

        ${devices && devices.length > 0 ? `
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Role</th>
                  <th>Auto Update</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${devices.map(device => `
                  <tr>
                    <td>${device.device_id}</td>
                    <td><span class="badge ${device.role === 'beta' ? 'badge-warning' : 'badge-info'}">${device.role}</span></td>
                    <td>${device.auto_update ? 'Yes' : 'No'}</td>
                    <td>${new Date(device.updated_at).toLocaleString()}</td>
                    <td>
                      <button class="btn btn-small btn-danger" onclick="deleteDevice('${device.device_id}', '${project.project_id}')">Delete</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <p>No devices added yet</p>
          </div>
        `}
      </div>

      ${project.realtime_fields && project.realtime_fields.length > 0 ? `
        <div class="card">
          <h2 class="card-title">Realtime Data</h2>
          <button class="btn btn-primary" onclick="window.router.navigate('/device/realtime?project_id=${project.project_id}')">View Realtime Data</button>
        </div>
      ` : ''}
    </div>

    <div id="add-device-modal" class="modal" style="display: none;">
      <div class="modal-content">
        <h2>Add Device to ${project.project_name}</h2>
        <form id="add-device-form">
          <input type="hidden" id="device_project_id" value="${project.project_id}">
          <div class="form-group">
            <label class="form-label" for="device_id">Device ID</label>
            <input type="text" id="device_id" class="form-input" placeholder="e.g., ESP32_001" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="device_role">Role</label>
            <select id="device_role" class="form-select">
              <option value="regular">Regular</option>
              <option value="beta">Beta</option>
            </select>
          </div>
          <div class="form-group">
            <div class="checkbox-wrapper">
              <input type="checkbox" id="device_auto_update">
              <label class="form-label" for="device_auto_update" style="margin: 0;">Enable Auto Update</label>
            </div>
          </div>
          <div class="actions">
            <button type="submit" class="btn btn-primary">Add Device</button>
            <button type="button" class="btn btn-secondary" onclick="hideAddDeviceModal()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  setupDeviceFormListener();
}

window.showAddDeviceModal = function(projectId) {
  document.getElementById('add-device-modal').style.display = 'flex';
};

window.hideAddDeviceModal = function() {
  document.getElementById('add-device-modal').style.display = 'none';
  document.getElementById('add-device-form').reset();
};

window.deleteDevice = async function(deviceId, projectId) {
  if (!confirm('Are you sure you want to delete this device?')) {
    return;
  }

  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('device_id', deviceId);

  if (error) {
    alert('Error deleting device: ' + error.message);
    return;
  }

  alert('Device deleted successfully');
  window.router.navigate(`/project?id=${projectId}`);
};

function setupDeviceFormListener() {
  const form = document.getElementById('add-device-form');
  if (form && !form.dataset.listenerAttached) {
    form.dataset.listenerAttached = 'true';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const projectId = document.getElementById('device_project_id').value;
      const deviceId = document.getElementById('device_id').value;
      const role = document.getElementById('device_role').value;
      const autoUpdate = document.getElementById('device_auto_update').checked;

      const { error } = await supabase
        .from('devices')
        .insert({
          device_id: deviceId,
          project_id: projectId,
          role: role,
          auto_update: autoUpdate,
        });

      if (error) {
        alert('Error adding device: ' + error.message);
        return;
      }

      alert('Device added successfully');
      window.hideAddDeviceModal();
      window.router.navigate(`/project?id=${projectId}`);
    });
  }
}
