import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Music, Mic, Guitar, Drum, Piano, Send, X, Play, Volume2, Radio } from 'lucide-react';

interface User {
  id: string;
  name: string;
  instrument: string;
  color: string;
}

interface Session {
  id: string;
  name: string;
  users: Record<string, User>;
  bpm: number;
}

const INSTRUMENTS = [
  { id: 'vocals', name: 'Vocals', icon: Mic },
  { id: 'guitar', name: 'Guitar', icon: Guitar },
  { id: 'drums', name: 'Drums', icon: Drum },
  { id: 'piano', name: 'Piano', icon: Piano },
  { id: 'synth', name: 'Synth', icon: Music },
];

export default function JamSession() {
  const [sessionId, setSessionId] = useState('');
  const [userName, setUserName] = useState('');
  const [instrument, setInstrument] = useState('vocals');
  const [joined, setJoined] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    if (joined) {
      socketRef.current = io();

      socketRef.current.emit('join-session', {
        sessionId,
        userName,
        instrument
      });

      socketRef.current.on('session-update', (updatedSession: Session) => {
        setSession(updatedSession);
      });

      socketRef.current.on('jam-event', (event: any) => {
        // Latency compensation: calculate offset
        const offset = Date.now() - event.serverTime;
        setLatency(offset);
        
        setEvents(prev => [...prev.slice(-10), { ...event, offset }]);
      });

      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [joined]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionId && userName) {
      setJoined(true);
    }
  };

  const sendJamEvent = (type: string, data: any = {}) => {
    if (socketRef.current) {
      socketRef.current.emit('jam-event', {
        sessionId,
        type,
        data
      });
      // Local feedback
      setEvents(prev => [...prev.slice(-10), { userId: 'me', type, data, serverTime: Date.now() }]);
    }
  };

  const updateInstrument = (newInstrument: string) => {
    setInstrument(newInstrument);
    if (socketRef.current) {
      socketRef.current.emit('update-instrument', { sessionId, instrument: newInstrument });
    }
  };

  if (!joined) {
    return (
      <div className="max-w-md mx-auto bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-6 backdrop-blur-xl">
        <div className="text-center space-y-2">
          <Radio className="w-12 h-12 text-orange-500 mx-auto animate-pulse" />
          <h2 className="text-2xl font-bold">Join a Jam Session</h2>
          <p className="text-zinc-500 text-sm">Collaborate with musicians in real-time.</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-zinc-500">Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="e.g. SUMMER-JAM-2026"
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 focus:border-orange-500 outline-none transition-colors"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-zinc-500">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your stage name"
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 focus:border-orange-500 outline-none transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            Start Jamming
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Session Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{session?.name || 'Connecting...'}</h2>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {Object.keys(session?.users || {}).length} Online
              </span>
              <span>•</span>
              <span className="text-green-500">Live Sync Active</span>
              {latency > 0 && (
                <>
                  <span>•</span>
                  <span className="text-orange-400">Latency: {latency}ms</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {INSTRUMENTS.map((inst) => {
            const Icon = inst.icon;
            return (
              <button
                key={inst.id}
                onClick={() => updateInstrument(inst.id)}
                className={`p-3 rounded-xl border transition-all ${
                  instrument === inst.id 
                    ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' 
                    : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'
                }`}
                title={inst.name}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
          <button 
            onClick={() => setJoined(false)}
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Participants Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {(Object.values(session?.users || {}) as User[]).map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl overflow-hidden group"
              >
                <div 
                  className="absolute top-0 left-0 w-1 h-full" 
                  style={{ backgroundColor: user.color }}
                />
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl"
                    style={{ backgroundColor: user.color + '44', border: `1px solid ${user.color}` }}
                  >
                    {(() => {
                      const Icon = INSTRUMENTS.find(i => i.id === user.instrument)?.icon || Music;
                      return <Icon className="w-8 h-8" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{user.name} {user.id === socketRef.current?.id && '(You)'}</h3>
                    <p className="text-zinc-500 text-sm capitalize">{user.instrument}</p>
                  </div>
                </div>

                {/* Visualizer Placeholder */}
                <div className="mt-6 flex items-end gap-1 h-12">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: events.some(e => e.userId === user.id) ? [10, 40, 15, 35, 10] : 4 
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.5 + Math.random(),
                        ease: "easeInOut"
                      }}
                      className="flex-1 rounded-full"
                      style={{ backgroundColor: user.color + '88' }}
                    />
                  ))}
                </div>

                {/* Action Button */}
                {user.id === socketRef.current?.id && (
                  <button
                    onClick={() => sendJamEvent('note', { pitch: 60 })}
                    className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" /> Play Note
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Live Feed / Activity */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[40px] p-8 space-y-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-orange-500" /> Live Feed
            </h3>
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Real-time Sync</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {events.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                <Music className="w-12 h-12" />
                <p className="text-sm">Waiting for the first note...</p>
              </div>
            )}
            {events.slice().reverse().map((event, i) => {
              const user = session?.users[event.userId];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-black/40 rounded-2xl border border-zinc-800/50"
                >
                  <div 
                    className="w-2 h-2 rounded-full animate-ping" 
                    style={{ backgroundColor: user?.color || '#555' }} 
                  />
                  <div className="flex-1">
                    <p className="text-xs">
                      <span className="font-bold" style={{ color: user?.color }}>{user?.name || 'System'}</span>
                      <span className="text-zinc-500"> played a </span>
                      <span className="text-zinc-200">{event.type}</span>
                    </p>
                  </div>
                  {event.offset && (
                    <span className="text-[10px] font-mono text-zinc-600">{event.offset}ms</span>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-zinc-800/50">
            <div className="flex gap-2">
              <button 
                onClick={() => sendJamEvent('beat', { intensity: 0.8 })}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-colors"
              >
                Drop Beat
              </button>
              <button 
                onClick={() => sendJamEvent('vocal', { phrase: 'Yeah!' })}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-colors"
              >
                Hype Ad-lib
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
