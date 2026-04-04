import {
  CABLE_STANDARDS,
  STANDARD_SIZES,
  VOLTAGE_DROP_XLPE_3_4C,
  OD_XLPE_ARMOURED,
  ISOLATOR_MODELS,
} from './data.js';

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function parseBreakerSizes(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  }
  return [...new Set(String(input || '')
    .split(',')
    .map((token) => Number(token.trim()))
    .filter(Number.isFinite))].sort((a, b) => a - b);
}

export function nextStandard(minimum, options) {
  const numeric = options.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  return numeric.find((item) => item >= minimum) ?? numeric[numeric.length - 1] ?? minimum;
}

export function computeCurrent({ phaseType, voltage, powerFactor, loadMode, loadValue }) {
  const value = Number(loadValue) || 0;
  const pf = Math.max(0.1, Number(powerFactor) || 1);
  const volts = Number(voltage) || (phaseType === '1P' ? 230 : 400);
  if (!value) return 0;
  if (loadMode === 'amp') return value;
  if (phaseType === '1P') {
    return (value * 1000) / (volts * pf);
  }
  return (value * 1000) / (Math.sqrt(3) * volts * pf);
}

export function computeConnectedKw({ loadMode, loadValue, phaseType, voltage, powerFactor }) {
  const value = Number(loadValue) || 0;
  const pf = Math.max(0.1, Number(powerFactor) || 1);
  const volts = Number(voltage) || (phaseType === '1P' ? 230 : 400);
  if (!value) return 0;
  if (loadMode === 'kw') return value;
  if (phaseType === '1P') {
    return (value * volts * pf) / 1000;
  }
  return (Math.sqrt(3) * volts * value * pf) / 1000;
}

export function selectBreaker(designCurrent, breakerSizes) {
  return nextStandard(designCurrent, breakerSizes);
}

export function selectCableBase({ phaseType, cableStandardKey, designCurrent, breakerCurrent }) {
  const standard = CABLE_STANDARDS[cableStandardKey];
  if (!standard) {
    throw new Error(`Unknown cable standard: ${cableStandardKey}`);
  }

  const rows = standard.rows;
  let selected = null;

  for (const row of rows) {
    const maxBreaker = row.maxBreaker ?? row.maxCurrent;
    const size = standard.family === 'single-core'
      ? (phaseType === '1P' ? row.size1P : row.size3P)
      : row.size;
    if (!size) continue;
    if (row.maxCurrent >= designCurrent && maxBreaker >= breakerCurrent) {
      selected = { ...row, size };
      break;
    }
  }

  if (!selected) {
    const lastRow = rows[rows.length - 1];
    selected = {
      ...lastRow,
      size: standard.family === 'single-core'
        ? (phaseType === '1P' ? lastRow.size1P : lastRow.size3P)
        : lastRow.size,
      overflow: true,
    };
  }

  return selected;
}

export function getEarthCableSize(powerCableSize, rule = 'sameUpTo16HalfAbove') {
  const size = Number(powerCableSize) || 0;
  if (rule === 'sameAlways') return size;
  if (size <= 16) return size;
  return nextStandard(size / 2, STANDARD_SIZES);
}

export function getCoreCount({ phaseType, neutralRequired, cableStandardKey }) {
  if (cableStandardKey === 'singleCorePVC') {
    return phaseType === '1P' ? 2 : neutralRequired ? 4 : 3;
  }
  if (phaseType === '1P') return 2;
  return neutralRequired ? 4 : 3;
}

export function calculateVoltageDrop({ cableStandardKey, size, current, distance, voltage, phaseType }) {
  if (cableStandardKey !== 'multicoreXLPE') {
    return { percent: null, volts: null, note: 'Voltage-drop table not attached for this standard.' };
  }
  const coeff = VOLTAGE_DROP_XLPE_3_4C[size];
  if (!coeff) {
    return { percent: null, volts: null, note: 'No attached voltage-drop coefficient for selected size.' };
  }
  const volts = coeff * Number(current || 0) * (Number(distance || 0) / 1000);
  const percent = (volts / Number(voltage || (phaseType === '1P' ? 230 : 400))) * 100;
  return { percent: round(percent, 2), volts: round(volts, 2), note: null };
}

export function upsizeForVoltageDrop({
  phaseType,
  cableStandardKey,
  designCurrent,
  breakerCurrent,
  distance,
  voltage,
  profile,
}) {
  const standard = CABLE_STANDARDS[cableStandardKey];
  const limit = Number(profile?.voltageDropLimitPercent || 4);
  let base = selectCableBase({ phaseType, cableStandardKey, designCurrent, breakerCurrent });
  let result = calculateVoltageDrop({
    cableStandardKey,
    size: base.size,
    current: designCurrent,
    distance,
    voltage,
    phaseType,
  });

  if (!standard.voltageDropAvailable || result.percent === null || result.percent <= limit) {
    return { base, voltageDrop: result, upsized: false };
  }

  const rows = standard.rows;
  for (const row of rows) {
    const candidate = standard.family === 'single-core'
      ? { ...row, size: phaseType === '1P' ? row.size1P : row.size3P }
      : { ...row, size: row.size };
    if (!candidate.size || candidate.size < base.size) continue;
    const candidateDrop = calculateVoltageDrop({
      cableStandardKey,
      size: candidate.size,
      current: designCurrent,
      distance,
      voltage,
      phaseType,
    });
    const maxBreaker = row.maxBreaker ?? row.maxCurrent;
    if (row.maxCurrent >= designCurrent && maxBreaker >= breakerCurrent && candidateDrop.percent !== null && candidateDrop.percent <= limit) {
      return { base: candidate, voltageDrop: candidateDrop, upsized: candidate.size !== base.size };
    }
  }

  return {
    base,
    voltageDrop: result,
    upsized: false,
    voltageDropWarning: `Voltage drop ${result.percent}% is above profile limit ${limit}%. Manual review required.`,
  };
}

export function selectIsolator(phaseType, breakerCurrent) {
  const options = ISOLATOR_MODELS[phaseType] || [];
  const selected = options.find((item) => breakerCurrent <= item.upto);
  if (!selected) {
    return {
      model: 'Manual selection required',
      poles: phaseType === '1P' ? '2P' : '3P+N',
      cableEntry: 'Check manufacturer',
      note: 'Attached ABB extract does not cover this current rating.',
    };
  }
  return selected;
}

export function estimateOuterDiameter({ cableStandardKey, coreCount, size }) {
  if (cableStandardKey !== 'multicoreXLPE') return null;
  const bucket = OD_XLPE_ARMOURED[coreCount];
  return bucket?.[size] ?? null;
}

export function selectGland({ cableStandardKey, coreCount, size, glandRules }) {
  if (cableStandardKey === 'singleCorePVC') {
    return { gland: 'N/A', quantity: 0, od: null, note: 'Conduit single-core selection.' };
  }
  const od = estimateOuterDiameter({ cableStandardKey, coreCount, size });
  if (!od) {
    return { gland: 'Manual', quantity: 2, od: null, note: 'No attached OD available for automatic gland size.' };
  }
  const rule = (glandRules || []).find((item) => od >= item.minOd && od <= item.maxOd);
  if (!rule) {
    return { gland: 'Manual', quantity: 2, od, note: 'OD outside current gland rule set.' };
  }
  return { gland: rule.metric, quantity: 2, od, note: null };
}

export function selectLugs({ phaseType, neutralRequired, size }) {
  const currentCarryingConductors = phaseType === '1P' ? 2 : neutralRequired ? 4 : 3;
  const totalLugs = currentCarryingConductors * 2;
  const earthLugs = 2;
  return {
    powerLugs: `${totalLugs} x ${size} mm² Cu lugs`,
    earthLugs: `${earthLugs} x ECC Cu lugs`,
    totalCount: totalLugs + earthLugs,
  };
}

export function describeBreaker({ phaseType, breakerCurrent, mccbThreshold }) {
  const family = breakerCurrent > Number(mccbThreshold || 63) ? 'MCCB' : 'MCB';
  const poles = phaseType === '1P' ? 'SP' : 'TP';
  return `${breakerCurrent}A ${poles} ${family}`;
}

export function describeElcb({ enabled, phaseType, breakerCurrent, sensitivity }) {
  if (!enabled) return 'Not required';
  const poles = phaseType === '1P' ? '2P' : '4P';
  return `${breakerCurrent}A, ${sensitivity}mA, ${poles} ELCB`;
}

export function buildCableDescription({ cableStandardKey, phaseType, neutralRequired, size, earthSize }) {
  if (cableStandardKey === 'singleCorePVC') {
    const coreQty = phaseType === '1P' ? 2 : neutralRequired ? 4 : 3;
    return `${coreQty} x 1C x ${size} mm² PVC in concealed conduit + 1C x ${earthSize} mm² G/Y PVC`;
  }

  const coreCount = getCoreCount({ phaseType, neutralRequired, cableStandardKey });
  const standardText = cableStandardKey === 'multicoreXLPE' ? 'XLPE/SWA/PVC' : 'PVC/SWA/PVC';
  return `${coreCount}C x ${size} mm² ${standardText} + 1C x ${earthSize} mm² G/Y PVC`;
}

export function allocatePhaseLoads({ phaseType, connectedKw, singlePhaseLeg, existingTotals }) {
  const totals = { ...existingTotals };
  const leg = String(singlePhaseLeg || 'AUTO').toUpperCase();

  if (phaseType === '3P') {
    const each = connectedKw / 3;
    return {
      assignedLeg: 'TP',
      rKw: each,
      yKw: each,
      bKw: each,
    };
  }

  let assigned = leg;
  if (assigned === 'AUTO') {
    const ordered = Object.entries(totals).sort((a, b) => a[1] - b[1]);
    assigned = ordered[0]?.[0] ?? 'R';
  }

  return {
    assignedLeg: assigned,
    rKw: assigned === 'R' ? connectedKw : 0,
    yKw: assigned === 'Y' ? connectedKw : 0,
    bKw: assigned === 'B' ? connectedKw : 0,
  };
}

export function computeSelection(payload, profile, existingTotals = { R: 0, Y: 0, B: 0 }) {
  const phaseType = payload.phaseType;
  const neutralRequired = phaseType === '1P' ? true : payload.neutralRequired === 'yes';
  const designCurrentBase = computeCurrent(payload);
  const demandFactor = Math.max(0.1, Number(payload.demandFactor) || 1);
  const designCurrent = designCurrentBase * demandFactor;
  const connectedKw = computeConnectedKw(payload);
  const breakerCurrent = selectBreaker(designCurrent, profile.breakerSizes);
  const cableData = upsizeForVoltageDrop({
    phaseType,
    cableStandardKey: payload.cableStandard,
    designCurrent,
    breakerCurrent,
    distance: payload.distance,
    voltage: payload.voltage,
    profile,
  });
  const powerCableSize = cableData.base.size;
  const earthSize = getEarthCableSize(powerCableSize, profile.earthRule);
  const coreCount = getCoreCount({ phaseType, neutralRequired, cableStandardKey: payload.cableStandard });
  const gland = selectGland({
    cableStandardKey: payload.cableStandard,
    coreCount,
    size: powerCableSize,
    glandRules: profile.glandRules,
  });
  const isolator = selectIsolator(phaseType, breakerCurrent);
  const lugs = selectLugs({ phaseType, neutralRequired, size: powerCableSize });
  const breakerText = describeBreaker({ phaseType, breakerCurrent, mccbThreshold: profile.mccbThreshold });
  const elcbText = describeElcb({
    enabled: payload.useElcb === 'yes',
    phaseType,
    breakerCurrent,
    sensitivity: payload.elcbSensitivity,
  });
  const phaseLoads = allocatePhaseLoads({
    phaseType,
    connectedKw,
    singlePhaseLeg: payload.singlePhaseLeg,
    existingTotals,
  });

  const notes = [];
  if (cableData.upsized) notes.push('Cable upsized for voltage drop.');
  if (cableData.voltageDropWarning) notes.push(cableData.voltageDropWarning);
  if (cableData.base.overflow) notes.push('Current exceeds highest attached DEWA table entry.');
  if (gland.note) notes.push(gland.note);
  if (cableData.voltageDrop.note) notes.push(cableData.voltageDrop.note);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    equipmentName: payload.equipmentName,
    area: payload.area || '',
    quantity: Number(payload.quantity) || 1,
    phaseType,
    neutralRequired,
    loadMode: payload.loadMode,
    loadValue: Number(payload.loadValue) || 0,
    powerFactor: Number(payload.powerFactor) || 1,
    voltage: Number(payload.voltage) || (phaseType === '1P' ? 230 : 400),
    distance: Number(payload.distance) || 0,
    singlePhaseLeg: phaseLoads.assignedLeg,
    cableStandard: payload.cableStandard,
    connectedKw: round(connectedKw, 2),
    designCurrent: round(designCurrent, 2),
    breakerCurrent,
    breakerText,
    elcbText,
    powerCableSize,
    earthSize,
    cableDescription: buildCableDescription({
      cableStandardKey: payload.cableStandard,
      phaseType,
      neutralRequired,
      size: powerCableSize,
      earthSize,
    }),
    gland,
    lugs,
    isolator,
    voltageDrop: cableData.voltageDrop,
    rKw: round(phaseLoads.rKw, 2),
    yKw: round(phaseLoads.yKw, 2),
    bKw: round(phaseLoads.bKw, 2),
    notes: [...notes, payload.notes].filter(Boolean).join(' '),
  };
}

export function summarizeSchedule(schedule) {
  return schedule.reduce((acc, item) => {
    acc.R += Number(item.rKw || 0);
    acc.Y += Number(item.yKw || 0);
    acc.B += Number(item.bKw || 0);
    acc.total += Number(item.connectedKw || 0);
    return acc;
  }, { R: 0, Y: 0, B: 0, total: 0 });
}

export function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function toCsvRows(schedule) {
  const header = [
    'SL #',
    'Equipment',
    'Area',
    'SP/TP',
    'Load Input',
    'Connected Load (kW)',
    'Design Current (A)',
    'Breaker',
    'ELCB',
    'Cable',
    'ECC Size (mm2)',
    'Isolator',
    'Gland',
    'Lugs',
    'Distance (m)',
    'Voltage Drop %',
    'R-Phase kW',
    'Y-Phase kW',
    'B-Phase kW',
    'Notes',
  ];

  const rows = schedule.map((item, index) => [
    index + 1,
    item.equipmentName,
    item.area,
    item.phaseType === '1P' ? 'SP' : 'TP',
    `${item.loadValue} ${item.loadMode === 'kw' ? 'kW' : 'A'}`,
    item.connectedKw,
    item.designCurrent,
    item.breakerText,
    item.elcbText,
    item.cableDescription,
    item.earthSize,
    item.isolator.model,
    `${item.gland.gland}${item.gland.quantity ? ` x${item.gland.quantity}` : ''}`,
    `${item.lugs.powerLugs}; ${item.lugs.earthLugs}`,
    item.distance,
    item.voltageDrop.percent ?? '',
    item.rKw,
    item.yKw,
    item.bKw,
    item.notes,
  ]);

  return [header, ...rows];
}

export function stringifyCsv(rows) {
  return rows.map((row) => row
    .map((value) => {
      const cell = value == null ? '' : String(value);
      const escaped = cell.replaceAll('"', '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(','))
    .join('\n');
}
