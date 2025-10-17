import { supabase } from '../lib/supabase.js';
import { authService } from '../lib/auth.js';
import { formatDate } from '../lib/utils.js';

export async function renderDeviceList() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="navbar">
      <div class="navbar-container">
        <a href="/" class="navbar-brand">IoT Dashboard</a>
        <ul class="navbar-nav">
          <li><a href="/" class="nav-link" data-link>Home</a></li>
          <li><a href="/firmware" class="nav-link" data-link>Firmware</a></li>
          <li><a href="/devices" class="nav-link active" data-link>Devices</a></li>
          <li><a href="/projects" class="nav-link" data-link>Projects</a></li>
          <li><button id="logout-btn" class="nav-link" style="background: none; border: none; cursor: pointer;">Logout</button></li>
        </ul>
      </div>
    </div>

    <div class="container">
      <div class="page-header">
        <h1 class="page-title">Device Management</h1>
        <p class="page-description">View and manage your bound devices</p>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <a href="/bind-device" class="btn btn-primary" data-link>+ Bind New Device</a>
      </div>

      <div class="card">
        <h2 class="card-title">My Devices</h2>
        <div id="device-list">
          <div class="loading">Loading devices...</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await authService.signOut();
    window.router.navigate('/login');
  });

  document.querySelectorAll('a[data-link]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.router.navigate(link.getAttribute('href'));
    });
  });

  loadDeviceList();
}

async function loadDeviceList() {
  const listContainer = document.getElementById('device-list');
  const userId = authService.getUserId();

  const { data: devices, error } = await supabase
    .from('devices')
    .select(`
      *,
      projects (name)
    `)
    .eq('user_id', userId)
    .eq('is_bound', true)
    .order('updated_at', { ascending: false });

  if (error) {
    listContainer.innerHTML = `<div class="empty-state">Error loading devices: ${error.message}</div>`;
    return;
  }

  if (!devices || devices.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📱</div>
        <p>No devices bound yet</p>
        <p style="margin-top: 1rem;"><a href="/bind-device" class="btn btn-primary" data-link>Bind Your First Device</a></p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Device Name</th>
            <th>Device Type</th>
            <th>Project</th>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${devices.map(device => `
            <tr>
              <td style="font-weight: 500;">${device.name}</td>
              <td><span class="badge badge-info">${device.device_type}</span></td>
              <td>${device.projects?.name || 'N/A'}</td>
              <td><span class="badge ${device.status === 'online' ? 'badge-success' : 'badge-secondary'}">${device.status}</span></td>
              <td>${device.last_seen ? formatDate(device.last_seen) : 'Never'}</td>
              <td>
                <div class="actions">
                  <button class="btn btn-small btn-info" onclick="window.router.navigate('/device/realtime?id=${device.id}')">Realtime</button>
                  <button class="btn btn-small btn-primary" onclick="window.router.navigate('/device/telemetry?id=${device.id}')">View</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
