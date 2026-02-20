// Simulated OPC-UA service for demo purposes.
// Returns realistic pharma process variables that drift over time.

const START_TIME = Date.now();

function sine(periodMs, amplitude, offset) {
  return offset + amplitude * Math.sin((2 * Math.PI * (Date.now() - START_TIME)) / periodMs);
}

function jitter(value, range) {
  return value + (Math.random() - 0.5) * 2 * range;
}

function getReadings() {
  return {
    reactor_temperature: {
      tag: 'REACTOR_01.TEMP',
      description: 'Reactor Temperature',
      value: parseFloat(jitter(sine(120000, 1.5, 65), 0.2).toFixed(2)),
      unit: '°C',
      setpoint: 65,
      tolerance: 2,
      timestamp: new Date().toISOString(),
    },
    mixer_speed: {
      tag: 'MIXER_01.RPM',
      description: 'Mixer Speed',
      value: Math.round(jitter(120, 4)),
      unit: 'RPM',
      setpoint: 120,
      tolerance: 10,
      timestamp: new Date().toISOString(),
    },
    relative_humidity: {
      tag: 'ENV_01.RH',
      description: 'Relative Humidity',
      value: parseFloat(jitter(sine(300000, 3, 45), 0.5).toFixed(1)),
      unit: '%RH',
      setpoint: 45,
      tolerance: 10,
      timestamp: new Date().toISOString(),
    },
    pressure: {
      tag: 'VESSEL_01.PRESS',
      description: 'Vessel Pressure',
      value: parseFloat(jitter(1.013, 0.005).toFixed(4)),
      unit: 'bar',
      setpoint: 1.013,
      tolerance: 0.05,
      timestamp: new Date().toISOString(),
    },
    dryer_outlet_temp: {
      tag: 'DRYER_01.OUTLET_TEMP',
      description: 'Dryer Outlet Temperature',
      value: parseFloat(jitter(sine(180000, 2, 42), 0.3).toFixed(2)),
      unit: '°C',
      setpoint: 42,
      tolerance: 5,
      timestamp: new Date().toISOString(),
    },
    batch_weight: {
      tag: 'SCALE_01.WEIGHT',
      description: 'Batch Weight',
      value: parseFloat(jitter(499.5, 0.5).toFixed(2)),
      unit: 'kg',
      setpoint: 500,
      tolerance: 2,
      timestamp: new Date().toISOString(),
    },
  };
}

function getEquipmentStatus() {
  return [
    {
      id: 'EQ-001',
      name: 'High-Shear Granulator HSG-300',
      type: 'granulator',
      status: 'running',
      calibration_due: '2026-05-15',
      last_cleaned: '2026-02-18',
      operator: 'S. Conti',
    },
    {
      id: 'EQ-002',
      name: 'Fluid Bed Dryer FBD-150',
      type: 'dryer',
      status: 'idle',
      calibration_due: '2026-04-30',
      last_cleaned: '2026-02-19',
      operator: null,
    },
    {
      id: 'EQ-003',
      name: 'Fette 3090 Tablet Press',
      type: 'tablet_press',
      status: 'maintenance',
      calibration_due: '2026-03-01',
      last_cleaned: '2026-02-15',
      operator: null,
    },
    {
      id: 'EQ-004',
      name: 'Bosch GKF Capsule Filler',
      type: 'capsule_filler',
      status: 'idle',
      calibration_due: '2026-06-10',
      last_cleaned: '2026-02-17',
      operator: null,
    },
  ];
}

function getAlarms() {
  // Occasionally surface a simulated low-priority alarm
  const shouldShowAlarm = Math.random() < 0.3;
  if (!shouldShowAlarm) return [];
  return [
    {
      id: 'ALM-' + Date.now(),
      severity: 'low',
      tag: 'ENV_01.RH',
      message: 'Relative humidity approaching upper limit (55% RH)',
      acknowledged: false,
      timestamp: new Date(Date.now() - Math.random() * 600000).toISOString(),
    },
  ];
}

module.exports = { getReadings, getEquipmentStatus, getAlarms };
