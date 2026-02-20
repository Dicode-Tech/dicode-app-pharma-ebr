import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { integrationService } from '../services/api';
import type { OpcReading, Equipment, Alarm } from '../types';
import {
  Radio, CheckCircle, AlertTriangle, Wrench,
  ThermometerSun, Gauge, Droplets, Scale, Fan, Loader2,
} from 'lucide-react';

const READING_ICONS: Record<string, React.ElementType> = {
  reactor_temperature: ThermometerSun,
  mixer_speed: Fan,
  relative_humidity: Droplets,
  pressure: Gauge,
  dryer_outlet_temp: ThermometerSun,
  batch_weight: Scale,
};

const EQUIPMENT_STATUS_STYLES: Record<string, string> = {
  running: 'bg-green-100 text-green-800',
  idle: 'bg-gray-100 text-gray-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  fault: 'bg-red-100 text-red-800',
};

function ReadingCard({ name, reading }: { name: string; reading: OpcReading }) {
  const Icon = READING_ICONS[name] || Gauge;
  const deviation = Math.abs(reading.value - reading.setpoint);
  const isOk = deviation <= reading.tolerance;
  const pct = Math.min(100, Math.max(0, ((reading.value - (reading.setpoint - reading.tolerance * 2)) /
    (reading.tolerance * 4)) * 100));

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${isOk ? 'border-green-200' : 'border-red-300'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{reading.description}</p>
            <p className="text-xs text-gray-400 font-mono">{reading.tag}</p>
          </div>
        </div>
        {isOk
          ? <CheckCircle className="w-4 h-4 text-green-500" />
          : <AlertTriangle className="w-4 h-4 text-red-500" />}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className={`text-2xl font-bold ${isOk ? 'text-green-700' : 'text-red-600'}`}>
            {reading.value}
          </span>
          <span className="text-sm text-gray-500 ml-1">{reading.unit}</span>
        </div>
        <div className="text-right text-xs text-gray-400">
          <div>SP: {reading.setpoint} {reading.unit}</div>
          <div>±{reading.tolerance}</div>
        </div>
      </div>
      <div className="mt-2 bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${isOk ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function IntegrationStatus() {
  const [connected, setConnected] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [readings, setReadings] = useState<Record<string, OpcReading>>({});
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [status, readingsData, equipmentData, alarmsData] = await Promise.all([
        integrationService.getStatus(),
        integrationService.getReadings(),
        integrationService.getEquipment(),
        integrationService.getAlarms(),
      ]);
      setConnected(status.connected);
      setEndpoint(status.endpoint);
      setReadings(readingsData.readings);
      setEquipment(equipmentData.equipment);
      setAlarms(alarmsData.alarms);
      setLastUpdated(new Date());
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="w-7 h-7 text-primary-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">OPC-UA Integration</h2>
              <p className="text-gray-500 text-sm">Live process variable monitoring</p>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refresh 5s
            </p>
          )}
        </div>

        {/* Connection Status */}
        <div className={`rounded-lg border p-4 flex items-center gap-4 ${connected ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <div>
            <p className={`font-semibold ${connected ? 'text-green-800' : 'text-red-800'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </p>
            <p className="text-xs text-gray-500 font-mono">{endpoint || 'opc.tcp://localhost:4840'}</p>
          </div>
          {alarms.length > 0 && (
            <div className="ml-auto flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{alarms.length} Active Alarm(s)</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : (
          <>
            {/* Active Alarms */}
            {alarms.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Active Alarms</h3>
                {alarms.map(alarm => (
                  <div key={alarm.id} className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-yellow-800">{alarm.message}</p>
                      <p className="text-xs text-yellow-600 font-mono mt-0.5">{alarm.tag} · {new Date(alarm.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${alarm.severity === 'critical' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                      {alarm.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Live Readings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Process Variables</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(readings).map(([name, reading]) => (
                  <ReadingCard key={name} name={name} reading={reading} />
                ))}
              </div>
            </div>

            {/* Equipment Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Equipment Status</h3>
              <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Equipment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Operator</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Calibration Due</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Cleaned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {equipment.map(eq => (
                      <tr key={eq.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{eq.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{eq.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${EQUIPMENT_STATUS_STYLES[eq.status] || 'bg-gray-100 text-gray-700'}`}>
                            {eq.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{eq.operator || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{eq.calibration_due}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{eq.last_cleaned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
