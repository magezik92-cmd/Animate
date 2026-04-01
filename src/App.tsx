import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music2, Sparkles, Zap, Mic2, Layers, Radio, Play } from 'lucide-react';
import VideoGenerator from './components/VideoGenerator';
import JamSession from './components/JamSession';

export default function App() {
  const [activeTab, setActiveTab] = useState<'animate' | 'jam'>('animate');

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-orange-500/30">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-900/40 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-20">
        {/* Header Section */}
        <header className="text-center space-y-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium tracking-wide uppercase"
          >
            <Sparkles className="w-4 h-4" />
            AI-Powered Music Challenges
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter"
          >
            Dual Music <span className="text-orange-500 italic">Challenge</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Transform photos into dynamic videos or join a live jam session. 
            The future of musical collaboration is here.
          </motion.p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800 flex gap-1 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('animate')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'animate' 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Play className="w-4 h-4 fill-current" /> Animate
            </button>
            <button
              onClick={() => setActiveTab('jam')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'jam' 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Radio className="w-4 h-4" /> Live Jam
            </button>
          </div>
        </div>

        {/* Main Content Section */}
        <section className="mb-24">
          <AnimatePresence mode="wait">
            {activeTab === 'animate' ? (
              <motion.div
                key="animate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <VideoGenerator />
              </motion.div>
            ) : (
              <motion.div
                key="jam"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <JamSession />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Challenge Concepts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">The Concepts</h2>
              <p className="text-zinc-500">Inspired by the visual contrast of personalities.</p>
            </div>

            <div className="space-y-8">
              {/* Challenge 1 */}
              <motion.div 
                whileHover={{ x: 10 }}
                className="group relative p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-orange-500/50 transition-all"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-[-12deg]">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">1. Sophisticated Hype</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    A masterclass in transition. Start with a smooth, soulful R&B verse—composed and cool. 
                    Then, the drop hits. Explode into high-energy Afrobeat ad-libs and rhythmic hype.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <span className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs font-mono">Soulful</span>
                    <span className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs font-mono">High-Energy</span>
                    <span className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs font-mono">Transition</span>
                  </div>
                </div>
              </motion.div>

              {/* Challenge 2 */}
              <motion.div 
                whileHover={{ x: 10 }}
                className="group relative p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-orange-500/50 transition-all"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center shadow-lg shadow-white/10 rotate-[12deg]">
                  <Layers className="w-6 h-6 text-black" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">2. Trad-Modern Fusion</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Where heritage meets the future. Blend traditional vocal runs and local dialects 
                    with modern rap flows and catchy pop hooks. A visual and sonic trade-off.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <span className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs font-mono">Traditional</span>
                    <span className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs font-mono">Modern</span>
                    <span className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs font-mono">Culture</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Visual Guide / Tips */}
          <div className="bg-zinc-900/30 rounded-[40px] p-10 border border-zinc-800/50 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Mic2 className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold">Pro Tips for Your Challenge</h3>
            </div>

            <ul className="space-y-6">
              {[
                { title: "Depth of Field", desc: "Use portrait mode for your photo to keep the focus sharp on the lead personality." },
                { title: "The Switch", desc: "For Challenge 2, trade places in the frame to emphasize the 'roots' vs 'radio' contrast." },
                { title: "Audio Cues", desc: "Choose tracks with clear beat drops or genre switches for maximum impact." },
                { title: "Expression", desc: "Contrast is key. Go from stoic and serious to joyful and hype in an instant." }
              ].map((tip, i) => (
                <li key={i} className="flex gap-4">
                  <span className="text-orange-500 font-mono font-bold">0{i + 1}</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-200">{tip.title}</h4>
                    <p className="text-zinc-500 text-sm leading-relaxed">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="pt-6 border-t border-zinc-800/50">
              <div className="flex items-center justify-between text-sm text-zinc-500 font-mono">
                <span>VEO ENGINE 3.1</span>
                <span>CHALLENGE READY</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-32 pt-8 border-t border-zinc-900 text-center text-zinc-600 text-sm">
          <p>© 2026 Dual Music Challenge. Powered by Google Gemini, Veo & WebSockets.</p>
        </footer>
      </main>
    </div>
  );
}
