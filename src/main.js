import { router } from './lib/router.js';
import { authService } from './lib/auth.js';
import { renderHome } from './pages/home.js';
import { renderFirmware } from './pages/firmware.js';
import { renderDeviceList } from './pages/devices.js';
import { renderProjectList } from './pages/projects.js';
import { renderProjectDetail } from './pages/project-detail.js';
import { renderDeviceTelemetry } from './pages/device-telemetry.js';
import { renderProjectTelemetry } from './pages/project-telemetry.js';
import { renderMLScriptEditor } from './pages/ml-script-editor.js';
import { renderRealtimeData } from './pages/realtime-data.js';
import { LoginPage, attachLoginListeners } from './pages/login.js';
import { SignupPage, attachSignupListeners } from './pages/signup.js';
import { BindDevicePage, attachBindDeviceListeners } from './pages/bind-device.js';
import './lib/device-manager.js';

window.router = router;

await authService.initialize();

router.requireAuth(() => authService.isAuthenticated());

function renderLoginPage() {
  document.getElementById('app').innerHTML = LoginPage();
  attachLoginListeners();
}

function renderSignupPage() {
  document.getElementById('app').innerHTML = SignupPage();
  attachSignupListeners();
}

function renderBindDevicePage() {
  document.getElementById('app').innerHTML = BindDevicePage();
  attachBindDeviceListeners();
}

authService.onAuthStateChange(() => {
  router.handleRoute();
});

router.register('/login', renderLoginPage);
router.register('/signup', renderSignupPage);
router.register('/bind-device', renderBindDevicePage, true);
router.register('/', renderHome, true);
router.register('/firmware', renderFirmware, true);
router.register('/devices', renderDeviceList, true);
router.register('/device/telemetry', renderDeviceTelemetry, true);
router.register('/device/realtime', renderRealtimeData, true);
router.register('/projects', renderProjectList, true);
router.register('/project', renderProjectDetail, true);
router.register('/project/telemetry', (params) => renderProjectTelemetry(params.get('id')), true);
router.register('/project/ml-script', renderMLScriptEditor, true);

router.init();
