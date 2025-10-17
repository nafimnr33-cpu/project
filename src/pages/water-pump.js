import { supabase } from '../lib/supabase.js';
import { renderDeviceTable } from '../lib/device-manager.js';
import { showNotification } from '../lib/utils.js';

export async function renderWaterPumpDashboard(project) {
  const app = document.getElementById('app');

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('project_id', project.project_id);

  const { count: telemetryCount } = await supabase
    .from('wp_samples')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.project_id);

  let latestModel = null;
  if (project.ml_enabled) {
    const { data: models } = await supabase
      .from('ml_models')
      .select('*')
      .eq('project_id', project.project_id)
      .order('created_at', { ascending: false })
      .limit(1);
    latestModel = models && models.length > 0 ? models[0] : null;
  }

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
      <div class="actions" style="margin-bottom: 1.5rem;">
        <button class="btn btn-secondary" onclick="window.router.navigate('/projects')">← Back to Projects</button>
        <button class="btn btn-primary" onclick="window.router.navigate('/project/telemetry?id=${project.project_id}')">View All Telemetry</button>
        ${project.ml_enabled ? `
          <button class="btn btn-success" onclick="window.router.navigate('/project/ml-script?id=${project.project_id}')">ML Script Editor</button>
          <button class="btn btn-warning" onclick="trainProjectModel('${project.project_id}')" ${!telemetryCount || telemetryCount < 10 ? 'disabled' : ''}>
            Train Model ${!telemetryCount || telemetryCount < 10 ? '(Need 10+ samples)' : ''}
          </button>
          ${latestModel ? `<button class="btn btn-info" onclick="downloadProjectModel(${latestModel.id}, '${latestModel.filename}')">Download Model</button>` : ''}
        ` : ''}
      </div>

      <div class="page-header">
        <h1 class="page-title">${project.project_name}</h1>
        <p class="page-description">
          <span class="badge badge-info">Water Pump</span>
          ${project.ml_enabled ? '<span class="badge badge-success" style="margin-left: 0.5rem;">ML Enabled</span>' : ''}
          <br>
          Project ID: ${project.project_id} | ${telemetryCount || 0} total samples
        </p>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 class="card-title" style="margin: 0;">Connected Devices</h2>
          <button class="btn btn-primary" onclick="openAddDeviceModal('${project.project_id}')">+ Add New Device</button>
        </div>
        ${renderDeviceTable(project, devices)}
      </div>

    </div>
  `;

  window.updateActiveNav('projects');
}

window.trainProjectModel = async function(projectId) {
  showNotification('Training model... This may take a minute', 'info');

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/train-model`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project_id: projectId })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const result = await response.json();
    showNotification('Model trained successfully! ' + result.training_samples + ' samples used', 'success');
    window.location.reload();
  } catch (error) {
    showNotification('Error training model: ' + error.message, 'error');
  }
};

window.downloadProjectModel = async function(modelId, filename) {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-model?id=${modelId}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download model');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showNotification('Model downloaded successfully', 'success');
  } catch (error) {
    showNotification('Error downloading model: ' + error.message, 'error');
  }
};
