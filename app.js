import {
  CABLE_STANDARDS,
  DEFAULT_PROFILES,
  SENSITIVITY_OPTIONS,
  STORAGE_KEYS,
} from './data.js';
import {
  computeSelection,
  formatNumber,
  parseBreakerSizes,
  stringifyCsv,
  summarizeSchedule,
  toCsvRows,
} from './logic.js';

const form = document.getElementById('equipmentForm');
const livePreview = document.getElementById('livePreview');
const scheduleBody = document.getElementById('scheduleBody');
const mobileSchedule = document.getElementById('mobileSchedule');
const profileSelect = document.getElementById('profileSelect');
const cableStandardSelect = document.getElementById('cableStandard');
const elcbSensitivitySelect = document.getElementById('elcbSensitivity');
const profileDialog = document.getElementById('profileDialog');
const profileNameInput = document.getElementById('profileName');
const profileCableStandardSelect = document.getElementById('profileCableStandard');
const profileVoltageDropInput = document.getElementById('profileVoltageDrop');
const profileMccbThresholdInput = document.getElementById('profileMccbThreshold');
const profileRequireElcbSelect = document.getElementById('profileRequireElcb');
const profileDefaultElcbSensitivitySelect = document.getElementById('profileDefaultElcbSensitivity');
const profileBreakerSizesInput = document.getElementById('profileBreakerSizes');
const profileEarthRuleSelect = document.getElementById('profileEarthRule');

const phaseTypeInput = document.getElementById('phaseType');
const voltageInput = document.getElementById('voltage');
const neutralRequiredInput = document.getElementById('neutralRequired');
const useElcbInput = document.getElementById('useElcb');
const submitButton = document.getElementById('submitButton');

const rPhaseTotal = document.getElementById('rPhaseTotal');
const yPhaseTotal = document.getElementById('yPhaseTotal');
const bPhaseTotal = document.getElementById('bPhaseTotal');
const overallTotal = document.getElementById('overallTotal');

let profiles = loadProfiles();
let activeProfileName = localStorage.getItem(STORAGE_KEYS.activeProfile) || Object.keys(profiles)[0];
if (!profiles[activeProfileName]) activeProfileName = Object.keys(profiles)[0];
let schedule = loadSchedule();
let editId = null;

function loadProfiles() {
  const raw = localStorage.getItem(STORAGE_KEYS.profiles);
  if (!raw) return structuredClone(DEFAULT_PROFILES);
  try {
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_PROFILES), ...parsed };
  } catch {
    return structuredClone(DEFAULT_PROFILES);
  }
}

function loadSchedule() {
  const raw = localStorage.getItem(STORAGE_KEYS.schedule);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
  localStorage.setItem(STORAGE_KEYS.schedule, JSON.stringify(schedule));
  localStorage.setItem(STORAGE_KEYS.activeProfile, activeProfileName);
}

function getActiveProfile() {
  return profiles[activeProfileName];
}

function populateSelect(select, options, formatter = (item) => ({ value: item, label: item })) {
  select.innerHTML = '';
  options.forEach((item) => {
    const option = document.createElement('option');
    const mapped = formatter(item);
    option.value = mapped.value;
    option.textContent = mapped.label;
    select.append(option);
  });
}

function refreshProfileOptions() {
  populateSelect(profileSelect, Object.keys(profiles), (name) => ({ value: name, label: name }));
  profileSelect.value = activeProfileName;
}

function refreshStandardOptions() {
  populateSelect(cableStandardSelect, Object.values(CABLE_STANDARDS), (item) => ({ value: item.key, label: item.label }));
  populateSelect(profileCableStandardSelect, Object.values(CABLE_STANDARDS), (item) => ({ value: item.key, label: item.label }));
  populateSelect(elcbSensitivitySelect, SENSITIVITY_OPTIONS, (value) => ({ value, label: `${value} mA` }));
  populateSelect(profileDefaultElcbSensitivitySelect, SENSITIVITY_OPTIONS, (value) => ({ value, label: `${value} mA` }));
}

function syncFormWithProfile() {
  const profile = getActiveProfile();
  cableStandardSelect.value = profile.preferredCableStandard;
  useElcbInput.value = profile.requireElcb ? 'yes' : 'no';
  elcbSensitivitySelect.value = String(profile.defaultElcbSensitivity);
  refreshLivePreview();
}

function openProfileManager() {
  const profile = getActiveProfile();
  profileNameInput.value = profile.name;
  profileCableStandardSelect.value = profile.preferredCableStandard;
  profileVoltageDropInput.value = profile.voltageDropLimitPercent;
  profileMccbThresholdInput.value = profile.mccbThreshold;
  profileRequireElcbSelect.value = profile.requireElcb ? 'yes' : 'no';
  profileDefaultElcbSensitivitySelect.value = String(profile.defaultElcbSensitivity);
  profileBreakerSizesInput.value = profile.breakerSizes.join(', ');
  profileEarthRuleSelect.value = profile.earthRule;
  profileDialog.showModal();
}

function updateVoltageByPhase() {
  const phase = phaseTypeInput.value;
  if (phase === '1P') {
    voltageInput.value = '230';
    neutralRequiredInput.value = 'yes';
    neutralRequiredInput.disabled = true;
  } else {
    voltageInput.value = '400';
    neutralRequiredInput.disabled = false;
  }
  refreshLivePreview();
}

function formDataObject() {
  return Object.fromEntries(new FormData(form).entries());
}

function scheduleTotals() {
  const totals = summarizeSchedule(schedule);
  return { R: totals.R, Y: totals.Y, B: totals.B };
}

function normalizePayload(basePayload, sequenceLabel = '') {
  const payload = { ...basePayload };
  if (sequenceLabel) payload.equipmentName = `${basePayload.equipmentName} ${sequenceLabel}`;
  return payload;
}

function previewCardHtml(item) {
  const voltageDropBadge = item.voltageDrop.percent == null
    ? `<span class="badge warn">VD check: manual</span>`
    : `<span class="badge ${item.voltageDrop.percent <= getActiveProfile().voltageDropLimitPercent ? 'good' : 'danger'}">VD ${item.voltageDrop.percent}%</span>`;

  return `
    <article class="preview-item">
      <div class="section-header">
        <div>
          <h3>${item.equipmentName || 'Preview'}</h3>
          <p class="subtle">${item.area || 'No area entered'} · ${item.phaseType === '1P' ? 'Single phase' : 'Three phase'}</p>
        </div>
        <div class="badge-group">
          <span class="badge">${item.breakerText}</span>
          ${voltageDropBadge}
        </div>
      </div>
      <div class="kv-grid">
        <div class="kv"><label>Design current</label><strong>${formatNumber(item.designCurrent)} A</strong></div>
        <div class="kv"><label>Connected load</label><strong>${formatNumber(item.connectedKw)} kW</strong></div>
        <div class="kv"><label>Power cable</label><strong>${item.powerCableSize} mm²</strong></div>
        <div class="kv"><label>ECC</label><strong>${item.earthSize} mm²</strong></div>
        <div class="kv"><label>Isolator</label><strong>${item.isolator.model}</strong></div>
        <div class="kv"><label>Gland</label><strong>${item.gland.gland}${item.gland.quantity ? ` × ${item.gland.quantity}` : ''}</strong></div>
      </div>
      <p class="subtle" style="margin-top:12px">${item.cableDescription}</p>
      ${item.notes ? `<p class="helper">${item.notes}</p>` : ''}
    </article>
  `;
}

function refreshLivePreview() {
  const basePayload = formDataObject();
  if (!basePayload.equipmentName || !basePayload.loadValue) {
    livePreview.innerHTML = `<div class="empty-state">Enter equipment details to see the automatic selection preview.</div>`;
    return;
  }

  try {
    const preview = computeSelection(normalizePayload(basePayload), getActiveProfile(), scheduleTotals());
    livePreview.innerHTML = previewCardHtml(preview);
  } catch (error) {
    livePreview.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

function renderSchedule() {
  if (!schedule.length) {
    scheduleBody.innerHTML = `<tr><td colspan="18"><div class="empty-state">No equipment added yet.</div></td></tr>`;
    mobileSchedule.innerHTML = `<div class="empty-state">No equipment added yet.</div>`;
  } else {
    scheduleBody.innerHTML = schedule.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${item.equipmentName}</strong><br /><span class="helper">${item.notes || '—'}</span></td>
        <td>${item.area || '—'}</td>
        <td>${item.phaseType === '1P' ? 'SP' : 'TP'}</td>
        <td>${item.loadValue} ${item.loadMode === 'kw' ? 'kW' : 'A'}</td>
        <td>${formatNumber(item.designCurrent)}</td>
        <td>${item.breakerText}</td>
        <td>${item.elcbText}</td>
        <td>${item.cableDescription}</td>
        <td>${item.earthSize}</td>
        <td>${item.isolator.model}<br /><span class="helper">${item.isolator.cableEntry}</span></td>
        <td>${item.gland.gland}${item.gland.quantity ? ` x${item.gland.quantity}` : ''}<br /><span class="helper">${item.gland.od ? `OD ${item.gland.od} mm` : ''}</span></td>
        <td>${item.lugs.powerLugs}<br /><span class="helper">${item.lugs.earthLugs}</span></td>
        <td>${item.voltageDrop.percent == null ? 'Manual' : formatNumber(item.voltageDrop.percent)}</td>
        <td>${formatNumber(item.rKw)}</td>
        <td>${formatNumber(item.yKw)}</td>
        <td>${formatNumber(item.bKw)}</td>
        <td>
          <div class="toolbar">
            <button class="btn btn-secondary" type="button" data-action="edit" data-id="${item.id}">Edit</button>
            <button class="btn btn-danger" type="button" data-action="delete" data-id="${item.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    mobileSchedule.innerHTML = schedule.map((item, index) => {
      const vdBadge = item.voltageDrop.percent == null
        ? `<span class="badge warn">VD manual</span>`
        : `<span class="badge ${item.voltageDrop.percent <= getActiveProfile().voltageDropLimitPercent ? 'good' : 'danger'}">VD ${item.voltageDrop.percent}%</span>`;
      return `
        <article class="mobile-card">
          <div class="mobile-card-head">
            <div>
              <p class="eyebrow">SL ${index + 1}</p>
              <h3>${item.equipmentName}</h3>
              <p class="subtle">${item.area || 'No area'} · ${item.phaseType === '1P' ? 'SP' : 'TP'} · ${item.breakerText}</p>
            </div>
            ${vdBadge}
          </div>
          <div class="mini-grid">
            <div class="kv"><label>Design current</label><strong>${formatNumber(item.designCurrent)} A</strong></div>
            <div class="kv"><label>Connected load</label><strong>${formatNumber(item.connectedKw)} kW</strong></div>
            <div class="kv"><label>Cable</label><strong>${item.powerCableSize} mm²</strong></div>
            <div class="kv"><label>ECC</label><strong>${item.earthSize} mm²</strong></div>
            <div class="kv"><label>ELCB</label><strong>${item.elcbText}</strong></div>
            <div class="kv"><label>Gland</label><strong>${item.gland.gland}${item.gland.quantity ? ` × ${item.gland.quantity}` : ''}</strong></div>
          </div>
          <p class="subtle" style="margin-top:10px">${item.cableDescription}</p>
          <p class="helper">${item.isolator.model} · ${item.lugs.powerLugs}</p>
          ${item.notes ? `<p class="helper">${item.notes}</p>` : ''}
          <div class="mobile-card-actions">
            <button class="btn btn-secondary" type="button" data-action="edit" data-id="${item.id}">Edit</button>
            <button class="btn btn-danger" type="button" data-action="delete" data-id="${item.id}">Delete</button>
          </div>
        </article>
      `;
    }).join('');
  }

  const totals = summarizeSchedule(schedule);
  rPhaseTotal.textContent = `${formatNumber(totals.R)} kW`;
  yPhaseTotal.textContent = `${formatNumber(totals.Y)} kW`;
  bPhaseTotal.textContent = `${formatNumber(totals.B)} kW`;
  overallTotal.textContent = `${formatNumber(totals.total)} kW`;

  saveState();
  refreshLivePreview();
}

function fillFormFromItem(item) {
  document.getElementById('equipmentName').value = item.equipmentName;
  document.getElementById('area').value = item.area || '';
  document.getElementById('quantity').value = 1;
  document.getElementById('loadMode').value = item.loadMode;
  document.getElementById('loadValue').value = item.loadValue;
  document.getElementById('phaseType').value = item.phaseType;
  document.getElementById('neutralRequired').value = item.neutralRequired ? 'yes' : 'no';
  document.getElementById('singlePhaseLeg').value = item.phaseType === '1P' ? item.singlePhaseLeg : 'AUTO';
  document.getElementById('powerFactor').value = item.powerFactor;
  document.getElementById('distance').value = item.distance;
  document.getElementById('voltage').value = item.voltage;
  document.getElementById('cableStandard').value = item.cableStandard;
  document.getElementById('useElcb').value = item.elcbText === 'Not required' ? 'no' : 'yes';
  const sensitivityMatch = item.elcbText.match(/(\d+)mA/);
  if (sensitivityMatch) document.getElementById('elcbSensitivity').value = sensitivityMatch[1];
  document.getElementById('demandFactor').value = '1';
  document.getElementById('notes').value = item.notes || '';
  editId = item.id;
  submitButton.textContent = 'Update schedule item';
  updateVoltageByPhase();
  refreshLivePreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  form.reset();
  document.getElementById('quantity').value = 1;
  document.getElementById('powerFactor').value = 0.85;
  document.getElementById('distance').value = 20;
  document.getElementById('demandFactor').value = 1;
  editId = null;
  submitButton.textContent = 'Add to schedule';
  syncFormWithProfile();
  updateVoltageByPhase();
}

function exportCsv() {
  const rows = toCsvRows(schedule);
  const csv = stringifyCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dewa-load-schedule.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function saveProfileFromDialog() {
  const originalName = activeProfileName;
  const name = profileNameInput.value.trim() || originalName;
  const profile = {
    name,
    preferredCableStandard: profileCableStandardSelect.value,
    breakerSizes: parseBreakerSizes(profileBreakerSizesInput.value),
    voltageDropLimitPercent: Number(profileVoltageDropInput.value) || 4,
    mccbThreshold: Number(profileMccbThresholdInput.value) || 63,
    requireElcb: profileRequireElcbSelect.value === 'yes',
    defaultElcbSensitivity: Number(profileDefaultElcbSensitivitySelect.value) || 100,
    earthRule: profileEarthRuleSelect.value,
    glandRules: getActiveProfile().glandRules,
  };

  if (!profile.breakerSizes.length) {
    alert('Enter at least one breaker size.');
    return;
  }

  if (name !== originalName) {
    delete profiles[originalName];
  }
  profiles[name] = profile;
  activeProfileName = name;
  refreshProfileOptions();
  syncFormWithProfile();
  saveState();
  profileDialog.close();
}

function deleteSelectedProfile() {
  if (Object.keys(profiles).length <= 1) {
    alert('At least one profile must remain.');
    return;
  }
  delete profiles[activeProfileName];
  activeProfileName = Object.keys(profiles)[0];
  refreshProfileOptions();
  syncFormWithProfile();
  saveState();
  profileDialog.close();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const basePayload = formDataObject();
  const qty = Math.max(1, Number(basePayload.quantity) || 1);

  if (editId) {
    const index = schedule.findIndex((item) => item.id === editId);
    if (index >= 0) schedule.splice(index, 1);
  }

  for (let i = 0; i < qty; i += 1) {
    const label = qty > 1 ? `(${i + 1}/${qty})` : '';
    const payload = normalizePayload(basePayload, label);
    const selection = computeSelection(payload, getActiveProfile(), scheduleTotals());
    if (editId && i === 0) selection.id = editId;
    schedule.push(selection);
  }

  schedule.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  resetForm();
  renderSchedule();
});

form.addEventListener('input', refreshLivePreview);
form.addEventListener('change', refreshLivePreview);
phaseTypeInput.addEventListener('change', updateVoltageByPhase);
profileSelect.addEventListener('change', () => {
  activeProfileName = profileSelect.value;
  syncFormWithProfile();
  renderSchedule();
});

document.getElementById('openProfileManager').addEventListener('click', openProfileManager);
document.getElementById('saveProfileButton').addEventListener('click', saveProfileFromDialog);
document.getElementById('deleteProfileButton').addEventListener('click', deleteSelectedProfile);
document.getElementById('resetFormButton').addEventListener('click', resetForm);
document.getElementById('loadDemoButton').addEventListener('click', () => {
  document.getElementById('equipmentName').value = 'Interactive Water Feature Pump';
  document.getElementById('area').value = 'Pump Room';
  document.getElementById('quantity').value = 1;
  document.getElementById('loadMode').value = 'kw';
  document.getElementById('loadValue').value = 7.5;
  document.getElementById('phaseType').value = '3P';
  document.getElementById('neutralRequired').value = 'no';
  document.getElementById('powerFactor').value = 0.85;
  document.getElementById('distance').value = 35;
  document.getElementById('cableStandard').value = getActiveProfile().preferredCableStandard;
  document.getElementById('useElcb').value = 'yes';
  document.getElementById('elcbSensitivity').value = String(getActiveProfile().defaultElcbSensitivity);
  document.getElementById('demandFactor').value = 1;
  document.getElementById('notes').value = 'Demo motor load';
  updateVoltageByPhase();
  refreshLivePreview();
});

document.getElementById('clearScheduleButton').addEventListener('click', () => {
  if (!schedule.length) return;
  if (!window.confirm('Clear the full schedule?')) return;
  schedule = [];
  renderSchedule();
});

document.getElementById('exportCsvButton').addEventListener('click', exportCsv);

function handleScheduleAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'delete') {
    schedule = schedule.filter((item) => item.id !== id);
    if (editId === id) resetForm();
    renderSchedule();
    return;
  }
  if (action === 'edit') {
    const item = schedule.find((entry) => entry.id === id);
    if (item) fillFormFromItem(item);
  }
}

scheduleBody.addEventListener('click', handleScheduleAction);
mobileSchedule.addEventListener('click', handleScheduleAction);

refreshStandardOptions();
refreshProfileOptions();
syncFormWithProfile();
updateVoltageByPhase();
renderSchedule();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => undefined);
  });
}
