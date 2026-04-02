import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Signal, Cpu, Database, Scan, ChevronDown, ChevronUp } from 'lucide-react';

const SystemStatusOverlay = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [status, setStatus] = useState({
    redis: { active: true, latency: 12 },
    pinecone: { active: true, latency: 45 },
    backend: { active: true, latency: 8 },
    llm: { active: true, latency: 120 },
    ocr: { active: false, latency: 0 },
  });

  // Simulated polling for status changes
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => ({
        ...prev,
        redis: { ...prev.redis, latency: 10 + Math.floor(Math.random() * 5) },
        pinecone: { ...prev.pinecone, latency: 40 + Math.floor(Math.random() * 10) },
        backend: { ...prev.backend, latency: 5 + Math.floor(Math.random() * 10) },
        llm: { ...prev.llm, latency: 100 + Math.floor(Math.random() * 50) },
        ocr: { ...prev.ocr, active: Math.random() > 0.05 }, // 95% up chance
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const StatusItem = ({ name, data, icon: Icon }) => (
    <div className="flex items-center justify-between gap-4 py-1.5 group/item">
      <div className="flex items-center gap-2">
        <div className={`relative flex h-2 w-2`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${data.active ? 'bg-emerald-400' : 'bg-red-400'} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${data.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
        </div>
        <Icon className="w-3.5 h-3.5 text-white/50 group-hover/item:text-white/80 transition-colors" />
        <span className="text-[11px] font-medium text-white/70 group-hover/item:text-white transition-colors uppercase tracking-wider">{name}</span>
      </div>
      <span className={`text-[10px] font-mono ${data.active ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
        {data.active ? `${data.latency}ms` : 'OFFLINE'}
      </span>
    </div>
  );

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col items-end">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="glass px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white hover:border-violet-500/50 transition-all border border-white/5 mb-2 group shadow-2xl"
      >
        <Signal className={`w-3.5 h-3.5 ${isOpen ? 'text-violet-400' : 'text-white/40'}`} />
        System Status
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="glass p-4 w-52 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-[40px] -z-10" />
            
            <div className="space-y-1">
              <StatusItem name="Redis" data={status.redis} icon={Database} />
              <StatusItem name="Pinecone" data={status.pinecone} icon={Database} />
              <StatusItem name="Backend" data={status.backend} icon={Cpu} />
              <StatusItem name="LLM (Groq)" data={status.llm} icon={Activity} />
              <StatusItem name="OCR" data={status.ocr} icon={Scan} />
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
              <span className="text-[9px] text-white/30 uppercase font-bold tracking-tighter">Live Telemetry</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ height: [4, 10, 6, 4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-0.5 bg-violet-500/50 rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SystemStatusOverlay;
