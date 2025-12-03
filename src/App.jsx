import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Settings, 
  RefreshCw, 
  Calendar, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Info,
  Battery,
  Thermometer,
  Zap,
  ShieldCheck,
  AlertOctagon,
  MapPin,
  Lock,
  Unlock,
  Eye
} from 'lucide-react';

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, type = "neutral" }) => {
  const styles = {
    neutral: "bg-slate-100 text-slate-600",
    success: "bg-emerald-100 text-emerald-700",
    danger: "bg-rose-100 text-rose-700",
    warning: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] || styles.neutral}`}>
      {children}
    </span>
  );
};

const StatBox = ({ label, value, subtext, icon: Icon, type = "neutral" }) => {
  const colors = {
    neutral: "text-slate-600",
    success: "text-emerald-600",
    danger: "text-rose-600",
    warning: "text-amber-600",
    blue: "text-blue-600"
  };

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${colors[type]}`} />}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {subtext && <div className={`text-xs mt-1 ${colors[type]}`}>{subtext}</div>}
      </div>
    </div>
  );
};

// --- Helpers ---

const toFahrenheit = (celsius) => {
  if (celsius === null || celsius === undefined) return null;
  return Math.round((celsius * 9/5) + 32);
};

const STORAGE_KEY = 'leaselad_config_v1';

// --- Main Application ---

export default function App() {
  // --- State ---
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'settings'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // User Config with LocalStorage Persistence
  const [config, setConfig] = useState(() => {
    // Try to load from local storage first
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    // Default fallback with token pre-filled and updated lease terms
    return {
      apiToken: 'Lw6nSBicDoDfShCNfqX57lAIdYe0aPRF', 
      vin: '',
      startDate: '2025-07-01', 
      leaseMonths: 24, 
      totalMiles: 30000, 
      startOdometer: 0 
    };
  });

  // Save to local storage whenever config changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // Vehicle Data
  const [vehicle, setVehicle] = useState(null);

  // --- Calculations ---

  const calculateLeaseStats = () => {
    if (!vehicle && !config.startOdometer && !config.totalMiles) return null;

    const today = new Date();
    
    // Parse Start Date (Local Time)
    const [y, m, d] = config.startDate.split('-').map(Number);
    const start = new Date(y, m - 1, d); 

    const end = new Date(start);
    end.setMonth(start.getMonth() + parseInt(config.leaseMonths));

    // Time calculations
    const totalDays = (end - start) / (1000 * 60 * 60 * 24);
    const daysElapsed = (today - start) / (1000 * 60 * 60 * 24);
    const daysRemaining = totalDays - daysElapsed;
    const pctTimeElapsed = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

    // Mileage calculations
    const currentOdo = vehicle ? vehicle.odometer : config.startOdometer;
    const actualDriven = Math.max(0, currentOdo - config.startOdometer);
    
    // Allowances
    const monthlyAllowance = config.totalMiles / config.leaseMonths; // e.g. 1250
    const dailyAllowance = config.totalMiles / totalDays; // For secondary stats display
    
    // --- REVISED MONTHLY CALCULATION (Based on full cycles) ---
    let monthsDifference = (today.getFullYear() * 12 + today.getMonth()) - 
                           (start.getFullYear() * 12 + start.getMonth());
    
    let totalMonthsAllowed = monthsDifference;
    if (today.getDate() >= start.getDate()) {
        totalMonthsAllowed += 1;
    } 

    // Ensure we don't go negative or over the total lease term
    totalMonthsAllowed = Math.min(parseInt(config.leaseMonths), Math.max(0, totalMonthsAllowed));
    
    // Expected mileage is the allowance multiplied by the number of cycles entered
    const expectedMileage = monthlyAllowance * totalMonthsAllowed;
    
    // Variance: Negative means savings (Ahead), Positive means deficit (Behind)
    const variance = actualDriven - expectedMileage;
    const isOver = variance > 0;
    
    // Projections
    const safeMonthsElapsed = Math.max(0.1, totalMonthsAllowed); // Use full cycles for stable projection pace
    const projectedTotal = (actualDriven / safeMonthsElapsed) * config.leaseMonths;
    const projectedVariance = projectedTotal - config.totalMiles;

    return {
      totalDays,
      daysElapsed,
      totalMonthsAllowed,
      daysRemaining,
      pctTimeElapsed,
      currentOdo,
      actualDriven,
      dailyAllowance,
      monthlyAllowance,
      expectedMileage,
      variance,
      isOver,
      projectedTotal,
      projectedVariance
    };
  };

  const stats = calculateLeaseStats();

  // --- Actions ---

  const fetchTessieData = async () => {
    if (!config.apiToken) {
      setError("Please enter a Tessie API Token first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Vehicle List
      const vehiclesRes = await fetch('https://api.tessie.com/vehicles', {
        headers: { 'Authorization': `Bearer ${config.apiToken}` }
      });

      if (!vehiclesRes.ok) throw new Error(`Failed to connect (${vehiclesRes.status}). Check token.`);

      const vehiclesData = await vehiclesRes.json();
      const results = vehiclesData.results || vehiclesData;
      
      if (!results || results.length === 0) throw new Error("No vehicles found on this Tessie account.");

      // Use a mutable variable (let) for targetVehicle
      let targetVehicle = config.vin 
        ? results.find(v => v.vin === config.vin) 
        : results[0];

      if (!targetVehicle) {
        // If VIN not found, try using the first vehicle found and warn the user.
        if (config.vin) {
           setError(`VIN ${config.vin} not found. Defaulting to first vehicle found.`);
        }
        // FIX: Assign to the mutable 'targetVehicle' (declared with 'let')
        targetVehicle = results[0];
      }
      
      // 2. Fetch Vehicle State Data
      const stateRes = await fetch(`https://api.tessie.com/${targetVehicle.vin}/state`, {
        headers: { 'Authorization': `Bearer ${config.apiToken}` }
      });
      
      if (!stateRes.ok) throw new Error("Failed to fetch vehicle state.");
      
      const stateData = await stateRes.json();
      
      // Extract data from nested objects
      const vehicleState = stateData.vehicle_state || {}; 
      const chargeState = stateData.charge_state || {};
      const climateState = stateData.climate_state || {};
      const driveState = stateData.drive_state || {};
      
      setVehicle({
        name: targetVehicle.display_name || "My Tesla",
        vin: targetVehicle.vin,
        odometer: vehicleState.odometer || 0,
        batteryLevel: chargeState.battery_level,
        chargingState: chargeState.charging_state || "Disconnected",
        // NEW STATS
        idealRange: chargeState.ideal_battery_range, 
        isLocked: vehicleState.locked,
        sentryMode: vehicleState.sentry_mode,
        latitude: driveState.latitude,
        longitude: driveState.longitude,
        // EXISTING STATS
        state: stateData.state,
        outsideTemp: climateState.outside_temp,
        insideTemp: climateState.inside_temp
      });
      
      setView('dashboard');

    } catch (err) {
      console.error(err);
      setError(err.message === 'Failed to fetch' 
        ? "Network Error: Browser security blocked the request. Try 'Demo Mode' or use a proxy." 
        : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    // Demo data matching user's scenario: 1250 mi/mo, 6 months in, 5034 miles driven.
    
    setConfig(prev => ({
      ...prev,
      startDate: '2025-07-01', 
      leaseMonths: 24, 
      totalMiles: 30000, 
      startOdometer: 0
    }));
    setVehicle({
      name: "Demo Tesla (6 Months In)",
      vin: "5YJ...DEMO",
      odometer: 5034, 
      batteryLevel: 78,
      chargingState: "Disconnected",
      state: "online",
      outsideTemp: 18.0,
      insideTemp: 22.0,
      // NEW DEMO STATS
      idealRange: 215,
      isLocked: true,
      sentryMode: true,
      latitude: 40.7128, // NYC lat
      longitude: -74.0060, // NYC lon
    });
    setView('dashboard');
    setError(null);
  };
  
  // --- Map Component ---
  const LocationMap = ({ lat, lng, carName }) => {
    if (!lat || !lng) {
        return (
            <div className="flex items-center justify-center h-full min-h-64 bg-slate-100 rounded-lg text-slate-500 p-4">
                <MapPin className="w-5 h-5 mr-2" />
                Location data is currently unavailable.
            </div>
        );
    }
    
    // Using Google Maps Embed API for a simple, non-interactive map image/iframe
    // Note: A key is usually required for production, but the basic embed is often functional
    const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=14&output=embed`;
    
    return (
        <Card className="h-full">
            <h3 className="flex items-center space-x-2 font-bold text-slate-800 p-4 border-b">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>Vehicle Location</span>
            </h3>
            <div className="w-full h-full min-h-64">
                <iframe
                    title={`${carName} Location`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0, minHeight: '300px' }}
                    src={mapUrl}
                    allowFullScreen=""
                    aria-hidden="false"
                    tabIndex="0"
                    loading="lazy"
                ></iframe>
            </div>
        </Card>
    );
  };


  // --- Renderers ---

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 mb-8">
        <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
          <Car className="text-white w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Configure LeaseLad</h1>
        <p className="text-slate-500">Enter your lease details and Tessie API token.</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold border-b pb-2">
            <Settings className="w-5 h-5" />
            <h3>Lease Parameters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input 
                type="date" 
                value={config.startDate}
                onChange={e => setConfig({...config, startDate: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Months)</label>
              <input 
                type="number" 
                value={config.leaseMonths}
                onChange={e => setConfig({...config, leaseMonths: parseInt(e.target.value)})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Mile Limit</label>
              <input 
                type="number" 
                value={config.totalMiles}
                onChange={e => setConfig({...config, totalMiles: parseInt(e.target.value)})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Starting Odometer</label>
              <input 
                type="number" 
                value={config.startOdometer}
                onChange={e => setConfig({...config, startOdometer: parseInt(e.target.value)})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold border-b pb-2">
            <Car className="w-5 h-5" />
            <h3>Tessie Connection</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tessie API Token</label>
            <input 
              type="password" 
              value={config.apiToken}
              onChange={e => setConfig({...config, apiToken: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="ey..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Generate at <a href="https://developer.tessie.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">developer.tessie.com</a>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-lg flex items-start space-x-2 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button 
            onClick={fetchTessieData}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Sync with Tessie</span>
          </button>
          
          <button 
            onClick={loadDemoData}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <Gauge className="w-4 h-4" />
            <span>Try Demo Mode (Scenario Match)</span>
          </button>
        </div>
      </Card>
    </div>
  );

  const renderDashboard = () => {
    if (!stats) return null;

    const healthColor = stats.isOver ? 'text-rose-600' : 'text-emerald-600';
    const bgHealthColor = stats.isOver ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100';
    const HealthIcon = stats.isOver ? AlertOctagon : ShieldCheck;
    
    const outTempF = toFahrenheit(vehicle?.outsideTemp);
    const inTempF = toFahrenheit(vehicle?.insideTemp);
    const isCharging = vehicle?.chargingState === "Charging";
    
    const lockType = vehicle?.isLocked ? "success" : "danger";
    const sentryType = vehicle?.sentryMode ? "success" : "warning";
    const lockIcon = vehicle?.isLocked ? Lock : Unlock;

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-900 text-white p-2 rounded-lg">
               <Car className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{vehicle?.name}</h2>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <span className="font-mono">VIN: {vehicle?.vin ? `${vehicle.vin.slice(0,3)}...${vehicle.vin.slice(-4)}` : 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={fetchTessieData}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setView('settings')}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Card: The Variance */}
        <Card className={`p-8 border-2 ${bgHealthColor}`}>
           <div className="flex flex-col md:flex-row items-center justify-between text-center md:text-left">
             <div>
                <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                    <Badge type={stats.isOver ? "danger" : "success"}>
                        {stats.isOver ? "BEHIND SCHEDULE" : "AHEAD OF SCHEDULE"}
                    </Badge>
                </div>
                <h3 className="text-slate-600 font-medium">
                  {stats.isOver ? "Mileage Deficit (Over Limit)" : "Mileage Buffer (Savings)"}
                </h3>
                <div className={`text-5xl font-black tracking-tight my-2 ${healthColor}`}>
                    {Math.abs(Math.round(stats.variance)).toLocaleString()} <span className="text-2xl font-bold text-slate-400">mi</span>
                </div>
                <p className="text-slate-500 text-sm max-w-md">
                    You have driven {Math.abs(Math.round(stats.variance)).toLocaleString()} miles {stats.isOver ? 'more' : 'less'} than expected for {stats.totalMonthsAllowed} full months of your lease.
                </p>
             </div>
             <div className="mt-6 md:mt-0 p-4 bg-white/50 rounded-full">
                <HealthIcon className={`w-16 h-16 ${healthColor}`} />
             </div>
           </div>
        </Card>

        {/* Lease Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox 
                label="Current Odometer" 
                value={Math.round(stats.currentOdo).toLocaleString()} 
                subtext="Total vehicle miles"
                icon={Gauge}
            />
             <StatBox 
                label="Allowed to Date" 
                value={Math.round(stats.expectedMileage).toLocaleString()} 
                subtext={`@ ${Math.round(stats.monthlyAllowance)} mi/month`}
                icon={CheckCircle2}
                type="blue"
            />
            <StatBox 
                label="Lease Consumed" 
                value={`${Math.round(stats.pctTimeElapsed)}%`} 
                subtext={`${Math.round(stats.daysRemaining)} days left`}
                icon={Calendar}
            />
             <StatBox 
                label="Projected End" 
                value={Math.round(stats.projectedTotal).toLocaleString()} 
                subtext={`${Math.abs(Math.round(stats.projectedVariance)).toLocaleString()} mi ${stats.projectedVariance > 0 ? 'over' : 'under'}`}
                icon={TrendingUp}
                type={stats.projectedVariance > 0 ? "danger" : "success"}
            />
        </div>

        {/* Status Row (Climate, Charging, Range) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <StatBox 
                label="Outside Temp" 
                value={outTempF ? `${outTempF}°F` : '--'} 
                subtext="Local Weather"
                icon={Thermometer}
            />
            <StatBox 
                label="Inside Temp" 
                value={inTempF ? `${inTempF}°F` : '--'} 
                subtext="Cabin Climate"
                icon={Thermometer}
            />
            <StatBox 
                label="Battery Level" 
                value={`${vehicle?.batteryLevel || '--'}%`} 
                subtext={vehicle?.chargingState}
                icon={isCharging ? Zap : Battery}
                type={isCharging ? "success" : (vehicle?.batteryLevel < 20 ? 'danger' : 'neutral')}
            />
             <StatBox 
                label="Ideal Range" 
                value={`${vehicle?.idealRange || '--'} mi`} 
                subtext="Estimated Distance"
                icon={TrendingUp}
                type={vehicle?.idealRange < 50 ? 'danger' : 'neutral'}
            />
        </div>
        
        {/* Security & Location Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatBox 
                label="Car Status" 
                value={vehicle?.isLocked ? 'Locked' : 'UNLOCKED'} 
                subtext={vehicle?.isLocked ? 'Secure' : 'Check Doors!'}
                icon={lockIcon}
                type={lockType}
            />
            <StatBox 
                label="Sentry Mode" 
                value={vehicle?.sentryMode ? 'ACTIVE' : 'Inactive'} 
                subtext={vehicle?.sentryMode ? 'Monitoring' : 'Needs Activation'}
                icon={Eye}
                type={sentryType}
            />
            <div className="col-span-full md:col-span-1">
                 {/* Empty space filler for alignment, map takes the full bottom row */}
            </div>
        </div>
        
        {/* Map Visualization */}
        <LocationMap 
            lat={vehicle?.latitude} 
            lng={vehicle?.longitude} 
            carName={vehicle?.name} 
        />

        {/* Visual Progress */}
        <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800">Visualizer</h3>
                <div className="text-sm text-slate-500">
                    Target: {config.totalMiles.toLocaleString()} mi / {config.leaseMonths} mo
                </div>
            </div>

            <div className="relative pt-6 pb-2">
                <div className="h-4 bg-slate-100 rounded-full w-full overflow-hidden flex">
                    {/* Time Progress (Par) */}
                    <div 
                        className="h-full bg-blue-200 opacity-50 absolute top-0 left-0" 
                        style={{ width: `${Math.min(100, stats.pctTimeElapsed)}%` }}
                    />
                    {/* Mileage Progress */}
                    <div 
                        className={`h-full transition-all duration-1000 ${stats.isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (stats.actualDriven / config.totalMiles) * 100)}%` }}
                    />
                </div>

                <div className="relative h-8 mt-2 text-xs font-medium text-slate-400">
                    <span className="absolute left-0">Start</span>
                    <span className="absolute right-0">End</span>
                    
                    <div 
                        className="absolute flex flex-col items-center transform -translate-x-1/2 transition-all duration-500"
                        style={{ left: `${Math.min(100, stats.pctTimeElapsed)}%`, top: '-3rem' }}
                    >
                         <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mb-1 whitespace-nowrap shadow-sm border border-blue-200">
                            Today
                        </div>
                        <div className="h-10 w-0.5 bg-blue-500"></div>
                    </div>
                </div>
            </div>

            <div className="mt-6 bg-slate-50 p-4 rounded-lg text-sm text-slate-600 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p>
                    The <strong>blue line</strong> is "Today". 
                    The <strong>{stats.isOver ? 'red' : 'green'} bar</strong> is your actual mileage. 
                </p>
            </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans text-slate-900 selection:bg-blue-100">
      {view === 'settings' ? renderSettings() : renderDashboard()}
    </div>
  );
}