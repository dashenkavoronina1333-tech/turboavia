/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Package, 
  Plane, 
  Ship, 
  Train, 
  Truck, 
  Info, 
  ChevronRight, 
  Scale, 
  Maximize,
  Layers,
  ShieldCheck,
  Phone,
  Mail,
  MessageCircle,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface DensityTier {
  min: number;
  max: number | null;
  price: number;
  unit: 'kg' | 'm3';
}

interface Tariff {
  id: string;
  name: string;
  icon: React.ReactNode;
  pricePerKg?: number;
  volumetricFactor?: number;
  densityTiers?: DensityTier[];
  deliveryDays: string;
  description: string;
  localDeliveryPrice?: number; // $/kg
}

interface ParcelData {
  weight: number; // kg
  length: number; // cm
  width: number; // cm
  height: number; // cm
  volume?: number; // m3
  declaredValue?: number; // USD
}

// --- Constants ---

const TURBO_GREEN = "#003d2b";
const TURBO_RED = "#e31e24";

const DEFAULT_TARIFFS: Tariff[] = [
  {
    id: 'turbo-sea',
    name: 'Turboavia Море',
    icon: <Ship className="w-5 h-5" />,
    densityTiers: [
      { min: 0, max: 100, price: 480, unit: 'm3' },
      { min: 100, max: 200, price: 580, unit: 'm3' },
      { min: 200, max: 250, price: 610, unit: 'm3' },
      { min: 250, max: 300, price: 640, unit: 'm3' },
      { min: 300, max: 350, price: 690, unit: 'm3' },
      { min: 350, max: 400, price: 740, unit: 'm3' },
      { min: 400, max: 450, price: 790, unit: 'm3' },
      { min: 450, max: 500, price: 840, unit: 'm3' },
      { min: 500, max: 700, price: 2.1, unit: 'kg' },
      { min: 700, max: 800, price: 2.3, unit: 'kg' },
      { min: 800, max: null, price: 2.5, unit: 'kg' },
    ],
    localDeliveryPrice: 0.4,
    deliveryDays: '65-75 днів',
    description: 'Морська доставка з тарифікацією за щільністю.'
  },
  {
    id: 'air-fast',
    name: 'Авіа (Швидка)',
    icon: <Plane className="w-5 h-5" />,
    pricePerKg: 12.5,
    volumetricFactor: 6000,
    deliveryDays: '7-12 днів',
    description: 'Найшвидший спосіб доставки для невеликих посилок.'
  },
  {
    id: 'train',
    name: 'Залізниця',
    icon: <Train className="w-5 h-5" />,
    pricePerKg: 4.5,
    volumetricFactor: 5000,
    deliveryDays: '35-45 днів',
    description: 'Надійний спосіб для середніх вантажів.'
  }
];

// --- Components ---

type CalculatorType = 'international' | 'novaposhta' | 'transfer';

interface NovaPoshtaData {
  weight: number;
  length: number;
  width: number;
  height: number;
  declaredValue: number;
  destination: 'city' | 'region' | 'ukraine';
}

interface MoneyTransferData {
  amount: number;
  method: 'card' | 'cash';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<CalculatorType>('international');
  const [tariffs] = useState<Tariff[]>(DEFAULT_TARIFFS);
  const [selectedTariffId, setSelectedTariffId] = useState<string>(DEFAULT_TARIFFS[0].id);
  
  // International Parcel State
  const [parcel, setParcel] = useState<ParcelData>({
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    volume: 0,
    declaredValue: 0
  });

  // Nova Poshta State
  const [npData, setNpData] = useState<NovaPoshtaData>({
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    declaredValue: 0,
    destination: 'city'
  });

  // Money Transfer State
  const [transferData, setTransferData] = useState<MoneyTransferData>({
    amount: 0,
    method: 'card'
  });

  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const selectedTariff = useMemo(() => 
    tariffs.find(t => t.id === selectedTariffId) || tariffs[0]
  , [tariffs, selectedTariffId]);

  // --- International Calculations ---
  const volumeM3 = useMemo(() => {
    // If manual volume is provided, use it
    if (parcel.volume && parcel.volume > 0) return parcel.volume;
    // Otherwise calculate from dimensions
    if (!parcel.length || !parcel.width || !parcel.height) return 0;
    return (parcel.length * parcel.width * parcel.height) / 1000000;
  }, [parcel.volume, parcel.length, parcel.width, parcel.height]);

  const density = useMemo(() => {
    if (volumeM3 === 0) return 0;
    return parcel.weight / volumeM3;
  }, [parcel.weight, volumeM3]);

  // Auto-update volume field when dimensions change
  React.useEffect(() => {
    if (parcel.length && parcel.width && parcel.height) {
      const calculatedVolume = (parcel.length * parcel.width * parcel.height) / 1000000;
      if (calculatedVolume !== parcel.volume) {
        setParcel(prev => ({ ...prev, volume: Number(calculatedVolume.toFixed(4)) }));
      }
    }
  }, [parcel.length, parcel.width, parcel.height]);

  const internationalDetails = useMemo(() => {
    let shippingCost = 0;
    let unit = '';
    let rate = 0;
    let chargeableValue = 0;

    if (selectedTariff.densityTiers) {
      const tier = selectedTariff.densityTiers.find(t => 
        density >= t.min && (t.max === null || density < t.max)
      );
      if (tier) {
        rate = tier.price;
        unit = tier.unit;
        chargeableValue = tier.unit === 'kg' ? parcel.weight : volumeM3;
        shippingCost = rate * chargeableValue;
      }
    } else if (selectedTariff.pricePerKg && selectedTariff.volumetricFactor) {
      const volumetricWeight = (parcel.length * parcel.width * parcel.height) / selectedTariff.volumetricFactor;
      chargeableValue = Math.max(parcel.weight, volumetricWeight);
      rate = selectedTariff.pricePerKg;
      unit = 'kg';
      shippingCost = rate * chargeableValue;
    }

    const insurance = (parcel.declaredValue || 0) * 0.02;
    const localDelivery = (selectedTariff.localDeliveryPrice || 0) * parcel.weight;
    const total = shippingCost + insurance + localDelivery;

    return { shippingCost, insurance, localDelivery, total, rate, unit, chargeableValue };
  }, [parcel, selectedTariff, density, volumeM3]);

  // --- Nova Poshta Calculations ---
  const npDetails = useMemo(() => {
    const volumetricWeight = (npData.length * npData.width * npData.height) / 4000;
    const chargeableWeight = Math.max(npData.weight, volumetricWeight);
    
    let basePrice = 0;
    if (chargeableWeight <= 2) basePrice = 70;
    else if (chargeableWeight <= 10) basePrice = 100;
    else if (chargeableWeight <= 30) basePrice = 140;
    else basePrice = 140 + (chargeableWeight - 30) * 5;

    // Destination multiplier
    if (npData.destination === 'region') basePrice += 20;
    if (npData.destination === 'ukraine') basePrice += 35;

    const insurance = Math.max(1, npData.declaredValue * 0.005);
    const total = basePrice + insurance;

    return { basePrice, insurance, total, chargeableWeight, volumetricWeight };
  }, [npData]);

  // --- Money Transfer Calculations ---
  const transferDetails = useMemo(() => {
    const feePercent = transferData.method === 'card' ? 0.01 : 0.02;
    const fixedFee = transferData.method === 'card' ? 5 : 20;
    const fee = (transferData.amount * feePercent) + fixedFee;
    const total = transferData.amount + fee;

    return { fee, total };
  }, [transferData]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-red-100">
      
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 py-2.5 hidden sm:block">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-[13px] text-gray-500 font-medium">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <Phone className="w-3 h-3 text-[#e31e24]" />
              </div>
              <span className="group-hover:text-[#e31e24] transition-colors">+38 097 214 70 11, +38 063 696 95 71</span>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <Mail className="w-3 h-3 text-[#e31e24]" />
              </div>
              <span className="group-hover:text-[#e31e24] transition-colors">info@turboavia.com</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 border-r border-gray-100 pr-6">
              <MessageCircle className="w-4 h-4 hover:text-[#e31e24] cursor-pointer transition-colors" />
              <Globe className="w-4 h-4 hover:text-[#e31e24] cursor-pointer transition-colors" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black cursor-pointer text-[#e31e24]">UA</span>
              <span className="text-gray-300">|</span>
              <span className="font-bold cursor-pointer hover:text-[#e31e24] transition-colors">RU</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-[#003d2b] sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#e31e24] rounded-lg flex items-center justify-center rotate-3 shadow-lg shadow-red-900/20">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="text-3xl font-black text-white tracking-tighter italic leading-none">TURBO<span className="text-[#e31e24]">AVIA</span></span>
                <span className="text-[9px] text-white/40 font-black uppercase tracking-[0.3em]">Logistics Expert</span>
              </div>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-4">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button 
                onClick={() => setActiveTab('international')}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'international' ? "bg-[#e31e24] text-white shadow-lg" : "text-white/60 hover:text-white"
                )}
              >
                Китай
              </button>
              <button 
                onClick={() => setActiveTab('novaposhta')}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'novaposhta' ? "bg-[#e31e24] text-white shadow-lg" : "text-white/60 hover:text-white"
                )}
              >
                Нова Пошта
              </button>
              <button 
                onClick={() => setActiveTab('transfer')}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'transfer' ? "bg-[#e31e24] text-white shadow-lg" : "text-white/60 hover:text-white"
                )}
              >
                Перекази
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-[#003d2b] py-24 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img 
            src="https://picsum.photos/seed/logistics/1920/1080?blur=2" 
            alt="Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#003d2b] via-[#003d2b]/80 to-[#003d2b]" />
        </div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-display font-black mb-6 tracking-tight leading-tight">
              Розрахунок <span className="text-[#e31e24]">вартості</span> доставки
            </h2>
            <p className="text-white/60 text-xl max-w-2xl mx-auto font-medium">
              Професійний калькулятор для точного прорахунку логістики з Китаю.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 -mt-16">
        
        {/* Left Column: Inputs */}
        <div className="lg:col-span-7 space-y-10">
          
          {activeTab === 'international' && (
            <>
              {/* Manual Input Section */}
              <section className="bg-white rounded-2xl p-10 shadow-2xl border-b-8 border-[#e31e24] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gray-50 -mr-20 -mt-20 rounded-full" />
                
                <div className="flex items-center gap-4 mb-10 relative z-10">
                  <div className="w-12 h-12 bg-[#003d2b] rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-900/20">
                    <Package className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="font-display font-black text-3xl uppercase tracking-tight text-[#003d2b]">Параметри вантажу</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Вкажіть дані вашої посилки</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 relative z-10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#e31e24]" /> Фактична вага (кг)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={parcel.weight || ''} 
                        onChange={(e) => setParcel(p => ({ ...p, weight: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-6 py-5 focus:border-[#003d2b] focus:bg-white outline-none font-black text-2xl transition-all placeholder:text-gray-200"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black">KG</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#e31e24]" /> Об'єм вантажу (м³)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={parcel.volume || ''} 
                        onChange={(e) => setParcel(p => ({ ...p, volume: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.000"
                        step="0.001"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-6 py-5 focus:border-[#003d2b] focus:bg-white outline-none font-black text-2xl transition-all placeholder:text-gray-200"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black">M³</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Maximize className="w-4 h-4 text-[#e31e24]" /> Габарити (см)
                      </label>
                      <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Об'єм розраховується автоматично</span>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="relative">
                        <input 
                          type="number" 
                          value={parcel.length || ''} 
                          onChange={(e) => setParcel(p => ({ ...p, length: parseFloat(e.target.value) || 0 }))}
                          placeholder="Д"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-5 focus:border-[#003d2b] focus:bg-white outline-none text-center font-black text-xl placeholder:text-gray-200"
                        />
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-gray-300 font-black uppercase">Довжина</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={parcel.width || ''} 
                          onChange={(e) => setParcel(p => ({ ...p, width: parseFloat(e.target.value) || 0 }))}
                          placeholder="Ш"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-5 focus:border-[#003d2b] focus:bg-white outline-none text-center font-black text-xl placeholder:text-gray-200"
                        />
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-gray-300 font-black uppercase">Ширина</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={parcel.height || ''} 
                          onChange={(e) => setParcel(p => ({ ...p, height: parseFloat(e.target.value) || 0 }))}
                          placeholder="В"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-5 focus:border-[#003d2b] focus:bg-white outline-none text-center font-black text-xl placeholder:text-gray-200"
                        />
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-gray-300 font-black uppercase">Висота</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 sm:col-span-2 pt-4">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#e31e24]" /> Оголошена вартість ($)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={parcel.declaredValue || ''} 
                        onChange={(e) => setParcel(p => ({ ...p, declaredValue: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-6 py-5 focus:border-[#003d2b] focus:bg-white outline-none font-black text-2xl transition-all placeholder:text-gray-200"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#e31e24] font-black">USD</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Tariffs Section */}
              <section className="bg-white rounded-2xl p-10 shadow-2xl">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-[#f8f9fa] rounded-xl flex items-center justify-center text-[#003d2b] border border-gray-100">
                    <Truck className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="font-display font-black text-3xl uppercase tracking-tight text-[#003d2b]">Спосіб доставки</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Оберіть оптимальний варіант</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {tariffs.map((tariff) => (
                    <button
                      key={tariff.id}
                      onClick={() => setSelectedTariffId(tariff.id)}
                      className={cn(
                        "relative p-8 rounded-2xl border-2 text-left transition-all duration-300 flex items-center justify-between group overflow-hidden",
                        selectedTariffId === tariff.id 
                          ? "border-[#003d2b] bg-[#003d2b]/5 ring-4 ring-[#003d2b]/5" 
                          : "border-gray-50 hover:border-gray-200 hover:bg-gray-50/50"
                      )}
                    >
                      <div className="flex items-center gap-8 relative z-10">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg",
                          selectedTariffId === tariff.id 
                            ? "bg-[#003d2b] text-white scale-110" 
                            : "bg-white text-gray-400 border border-gray-100 group-hover:text-[#003d2b]"
                        )}>
                          {tariff.icon}
                        </div>
                        <div>
                          <h3 className={cn(
                            "font-display font-black text-xl uppercase tracking-tight transition-colors",
                            selectedTariffId === tariff.id ? "text-[#003d2b]" : "text-gray-900"
                          )}>{tariff.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-[#e31e24] font-black uppercase tracking-widest">{tariff.deliveryDays}</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs text-gray-400 font-bold">{tariff.description}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === 'novaposhta' && (
            <section className="bg-white rounded-2xl p-10 shadow-2xl border-b-8 border-[#e31e24]">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-[#e31e24] rounded-xl flex items-center justify-center text-white">
                  <Truck className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-display font-black text-3xl uppercase tracking-tight text-[#003d2b]">Нова Пошта</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Доставка по Україні</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Вага (кг)</label>
                  <input 
                    type="number" 
                    value={npData.weight || ''} 
                    onChange={(e) => setNpData(p => ({ ...p, weight: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-6 py-4 font-black text-xl"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Напрямок</label>
                  <select 
                    value={npData.destination}
                    onChange={(e) => setNpData(p => ({ ...p, destination: e.target.value as any }))}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-6 py-4 font-black text-lg appearance-none"
                  >
                    <option value="city">По місту</option>
                    <option value="region">По області</option>
                    <option value="ukraine">По Україні</option>
                  </select>
                </div>
                <div className="sm:col-span-2 grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase">Д (см)</label>
                    <input type="number" value={npData.length || ''} onChange={(e) => setNpData(p => ({ ...p, length: parseFloat(e.target.value) || 0 }))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-lg px-4 py-3 text-center font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase">Ш (см)</label>
                    <input type="number" value={npData.width || ''} onChange={(e) => setNpData(p => ({ ...p, width: parseFloat(e.target.value) || 0 }))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-lg px-4 py-3 text-center font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase">В (см)</label>
                    <input type="number" value={npData.height || ''} onChange={(e) => setNpData(p => ({ ...p, height: parseFloat(e.target.value) || 0 }))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-lg px-4 py-3 text-center font-bold" />
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-4">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Оголошена вартість (грн)</label>
                  <input 
                    type="number" 
                    value={npData.declaredValue || ''} 
                    onChange={(e) => setNpData(p => ({ ...p, declaredValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-6 py-4 font-black text-xl"
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'transfer' && (
            <section className="bg-white rounded-2xl p-10 shadow-2xl border-b-8 border-[#e31e24]">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-[#003d2b] rounded-xl flex items-center justify-center text-white">
                  <Globe className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-display font-black text-3xl uppercase tracking-tight text-[#003d2b]">Грошові перекази</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">По Україні</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Сума переказу (грн)</label>
                  <input 
                    type="number" 
                    value={transferData.amount || ''} 
                    onChange={(e) => setTransferData(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-6 py-5 font-black text-3xl text-[#003d2b]"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setTransferData(p => ({ ...p, method: 'card' }))}
                    className={cn(
                      "p-6 rounded-xl border-2 font-black uppercase tracking-widest text-xs transition-all",
                      transferData.method === 'card' ? "border-[#003d2b] bg-[#003d2b] text-white" : "border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    На карту
                  </button>
                  <button 
                    onClick={() => setTransferData(p => ({ ...p, method: 'cash' }))}
                    className={cn(
                      "p-6 rounded-xl border-2 font-black uppercase tracking-widest text-xs transition-all",
                      transferData.method === 'cash' ? "border-[#003d2b] bg-[#003d2b] text-white" : "border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    Готівка
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Density Guide */}
          <section className="bg-[#003d2b] rounded-2xl p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 -mb-32 -mr-32 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h3 className="font-display font-black text-2xl uppercase mb-6 flex items-center gap-3">
                <Info className="w-6 h-6 text-[#e31e24]" />
                Як розраховується щільність?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <div className="text-[#e31e24] font-black text-3xl">01</div>
                  <p className="text-sm text-white/70 font-medium">Вимірюємо вагу вантажу в кілограмах (кг).</p>
                </div>
                <div className="space-y-2">
                  <div className="text-[#e31e24] font-black text-3xl">02</div>
                  <p className="text-sm text-white/70 font-medium">Вимірюємо об'єм вантажу в кубічних метрах (м³).</p>
                </div>
                <div className="space-y-2">
                  <div className="text-[#e31e24] font-black text-3xl">03</div>
                  <p className="text-sm text-white/70 font-medium">Ділимо вагу на об'єм. Отримуємо кг/м³.</p>
                </div>
              </div>
              <div className="mt-10 p-6 bg-white/5 rounded-xl border border-white/10 flex items-center gap-6">
                <div className="text-4xl font-black text-[#e31e24] italic">!</div>
                <p className="text-sm font-medium leading-relaxed">
                  Чим вища щільність вашого вантажу, тим вигідніша ставка за кілограм. Для морської доставки це ключовий показник вартості.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-5">
          <div className="sticky top-32 space-y-10">
            
            {/* Summary Card */}
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-12 shadow-2xl relative overflow-hidden border-2 border-[#003d2b]"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#003d2b] -mr-20 -mt-20 rounded-full" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 bg-[#e31e24] rounded-full animate-pulse" />
                  <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.3em]">
                    {activeTab === 'international' ? 'Доставка з Китаю' : activeTab === 'novaposhta' ? 'Нова Пошта' : 'Переказ коштів'}
                  </p>
                </div>
                
                <div className="flex flex-col mb-12">
                  <span className="text-8xl font-display font-black tracking-tighter text-[#003d2b] leading-none">
                    {activeTab === 'international' 
                      ? `$${internationalDetails.total.toFixed(2)}` 
                      : activeTab === 'novaposhta' 
                        ? `${npDetails.total.toFixed(0)} грн`
                        : `${transferDetails.total.toFixed(0)} грн`
                    }
                  </span>
                  <span className="text-xl font-black text-[#e31e24] mt-2 uppercase tracking-widest">
                    {activeTab === 'international' ? 'До сплати (USD)' : 'До сплати (UAH)'}
                  </span>
                </div>

                <div className="space-y-6 pt-10 border-t border-gray-100">
                  {activeTab === 'international' && (
                    <>
                      <div className="flex justify-between items-center group">
                        <span className="text-gray-400 text-[11px] font-black uppercase tracking-widest group-hover:text-[#003d2b] transition-colors">Логістика</span>
                        <span className="font-black text-2xl text-[#003d2b]">${internationalDetails.shippingCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="text-gray-400 text-[11px] font-black uppercase tracking-widest group-hover:text-[#003d2b] transition-colors">Страхування</span>
                        <span className="font-black text-2xl text-[#003d2b]">${internationalDetails.insurance.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {activeTab === 'novaposhta' && (
                    <>
                      <div className="flex justify-between items-center group">
                        <span className="text-gray-400 text-[11px] font-black uppercase tracking-widest group-hover:text-[#003d2b] transition-colors">Тариф</span>
                        <span className="font-black text-2xl text-[#003d2b]">{npDetails.basePrice.toFixed(0)} грн</span>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="text-gray-400 text-[11px] font-black uppercase tracking-widest group-hover:text-[#003d2b] transition-colors">Страхування</span>
                        <span className="font-black text-2xl text-[#003d2b]">{npDetails.insurance.toFixed(0)} грн</span>
                      </div>
                    </>
                  )}
                  {activeTab === 'transfer' && (
                    <>
                      <div className="flex justify-between items-center group">
                        <span className="text-gray-400 text-[11px] font-black uppercase tracking-widest group-hover:text-[#003d2b] transition-colors">Сума</span>
                        <span className="font-black text-2xl text-[#003d2b]">{transferData.amount.toFixed(0)} грн</span>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="text-gray-400 text-[11px] font-black uppercase tracking-widest group-hover:text-[#003d2b] transition-colors">Комісія</span>
                        <span className="font-black text-2xl text-[#003d2b]">{transferDetails.fee.toFixed(0)} грн</span>
                      </div>
                    </>
                  )}
                </div>

                <button 
                  onClick={() => setShowPhoneModal(true)}
                  className="w-full mt-14 bg-[#e31e24] text-white font-black py-6 rounded-2xl shadow-2xl shadow-red-900/40 hover:bg-[#c41a1f] hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-sm"
                >
                  Оформити заявку
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </motion.div>

            {/* Details Card */}
            <div className="bg-white rounded-2xl p-10 shadow-2xl border-l-8 border-[#003d2b]">
              <h3 className="font-display font-black text-gray-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f8f9fa] rounded-lg flex items-center justify-center text-[#003d2b]">
                  <Info className="w-6 h-6" />
                </div>
                Параметри розрахунку
              </h3>
              <div className="space-y-8">
                {activeTab === 'international' && (
                  <>
                    <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                      <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Щільність</p>
                        <p className="text-4xl font-black text-[#003d2b] mt-1">{density.toFixed(0)} <span className="text-sm font-bold text-gray-400">кг/м³</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Об'єм</p>
                        <p className="text-2xl font-black text-[#e31e24] mt-1">{volumeM3.toFixed(3)} <span className="text-xs text-gray-400 font-bold">м³</span></p>
                      </div>
                    </div>
                  </>
                )}
                {activeTab === 'novaposhta' && (
                  <>
                    <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                      <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Розрахункова вага</p>
                        <p className="text-4xl font-black text-[#003d2b] mt-1">{npDetails.chargeableWeight.toFixed(1)} <span className="text-sm font-bold text-gray-400">кг</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Об'ємна вага</p>
                        <p className="text-2xl font-black text-[#e31e24] mt-1">{npDetails.volumetricWeight.toFixed(1)} <span className="text-xs text-gray-400 font-bold">кг</span></p>
                      </div>
                    </div>
                  </>
                )}
                {activeTab === 'transfer' && (
                  <div className="bg-[#f8f9fa] p-6 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mb-4">Умови переказу</p>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                      Комісія за переказ {transferData.method === 'card' ? 'на карту' : 'готівкою'} складає 
                      <span className="text-[#e31e24] font-black"> {transferData.method === 'card' ? '1% + 5 грн' : '2% + 20 грн'}</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#003d2b] py-16 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#e31e24] rounded-lg flex items-center justify-center rotate-3">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-black italic tracking-tighter text-white">TURBO<span className="text-[#e31e24]">AVIA</span></span>
          </div>
          <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">© 2026 Turboavia Міжнародна Логістика. Всі права захищені.</p>
        </div>
      </footer>

      {/* Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div 
            className="absolute inset-0 bg-[#003d2b]/90 backdrop-blur-sm"
            onClick={() => setShowPhoneModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl p-10 max-w-md w-full relative z-10 shadow-2xl text-center border-b-8 border-[#e31e24]"
          >
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Phone className="w-10 h-10 text-[#e31e24]" />
            </div>
            <h3 className="text-3xl font-black text-[#003d2b] uppercase tracking-tight mb-4">Зв'яжіться з нами</h3>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">
              Для оформлення заявки зателефонуйте нашим менеджерам або напишіть у месенджери.
            </p>
            <div className="space-y-4">
              <a 
                href="tel:+380972147011" 
                className="block w-full py-5 bg-[#003d2b] text-white rounded-xl font-black text-xl hover:bg-[#002b1e] transition-colors"
              >
                +38 097 214 70 11
              </a>
              <a 
                href="tel:+380636969571" 
                className="block w-full py-5 border-2 border-[#003d2b] text-[#003d2b] rounded-xl font-black text-xl hover:bg-gray-50 transition-colors"
              >
                +38 063 696 95 71
              </a>
            </div>
            <button 
              onClick={() => setShowPhoneModal(false)}
              className="mt-8 text-gray-400 font-black uppercase tracking-widest text-xs hover:text-[#e31e24] transition-colors"
            >
              Закрити
            </button>
          </motion.div>
        </div>
      )}

      {/* Floating Contact Button */}
      <div className="fixed bottom-10 right-10 z-[100]">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-20 h-20 bg-[#e31e24] rounded-full shadow-2xl shadow-red-900/40 flex items-center justify-center text-white relative group"
        >
          <div className="absolute inset-0 bg-[#e31e24] rounded-full animate-ping opacity-20" />
          <Phone className="w-10 h-10 relative z-10" />
          <div className="absolute right-full mr-4 bg-white text-[#003d2b] px-4 py-2 rounded-lg shadow-xl font-black text-xs uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Зв'язатися з нами
          </div>
        </motion.button>
      </div>
    </div>
  );
}
