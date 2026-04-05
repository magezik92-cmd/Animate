import React, { useState } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Search, Music, Loader2, Play, Pause, Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SongInfo {
  title: string;
  artist: string;
  vibe: string;
  genre: string;
  bpm: number;
}

export default function MusicSearchGenerator({ onMusicGenerated }: { onMusicGenerated: (url: string) => void }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const searchSong = async () => {
    if (!query) return;
    setIsSearching(true);
    setError(null);
    setSongInfo(null);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find details for the song or musical style: "${query}". Provide the title, artist (if applicable), musical vibe, genre, and estimated BPM. Return as JSON.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        }
      });

      const info = JSON.parse(response.text);
      setSongInfo(info);
    } catch (err) {
      console.error(err);
      setError("Failed to find song details. Try a different search.");
    } finally {
      setIsSearching(false);
    }
  };

  const generateMusic = async () => {
    if (!songInfo) return;
    setIsGenerating(true);
    setError(null);

    try {
      // Check for key if using Lyria
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }

      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      // Using lyria-3-pro-preview for full-length tracks (aiming for 6 mins)
      let response;
      try {
        response = await ai.models.generateContentStream({
          model: "lyria-3-pro-preview",
          contents: `Generate a 6-minute full-length musical track inspired by ${songInfo.title} by ${songInfo.artist}. 
                    Genre: ${songInfo.genre}. Vibe: ${songInfo.vibe}. BPM: ${songInfo.bpm}. 
                    The track should have a clear intro, multiple build-ups, and energetic drops designed for a long-form music challenge.
                    Ensure the track is a unique composition that captures the essence of the requested style for the entire duration.`,
          config: {
            responseModalities: [Modality.AUDIO],
          }
        });
      } catch (err: any) {
        if (err.message?.includes("spending cap") || err.message?.includes("RESOURCE_EXHAUSTED")) {
          if (window.aistudio) await window.aistudio.openSelectKey();
          throw new Error("Your Google Cloud project has reached its spending cap. Please check your billing settings in the Google Cloud Console or select a different API key.");
        }
        if (err.message?.includes("permission") || err.message?.includes("403") || err.message?.includes("not found")) {
          if (window.aistudio) await window.aistudio.openSelectKey();
          throw new Error("API Key permission error. Please ensure you've selected a key from a paid Google Cloud project.");
        }
        throw err;
      }

      let audioBase64 = "";
      let textContent = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text) {
            textContent += part.text;
          }
        }
      }

      if (!audioBase64) {
        throw new Error(textContent || "No audio generated. The model may have refused the request due to safety or copyright filters. Try a more general description.");
      }

      const binary = atob(audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      setAudioUrl(url);
      onMusicGenerated(url);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("spending cap") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        setError("Your Google Cloud project has reached its spending cap. Please check your billing settings.");
      } else if (err.message?.includes("permission") || err.message?.includes("403") || err.message?.includes("not found")) {
        setError("API Key permission error. Paid models (Lyria) require a selected API key from a paid Google Cloud project.");
      } else {
        setError(err.message || "Failed to generate music. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
          <Music className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Song Choice</h3>
          <p className="text-zinc-500 text-xs uppercase tracking-widest">90s+ Full Length Track</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchSong()}
            placeholder="Search for a song or artist..."
            className="w-full bg-black border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 focus:border-orange-500 outline-none transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <button
            onClick={searchSong}
            disabled={isSearching || !query}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </div>

        <AnimatePresence>
          {songInfo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-orange-500">{songInfo.title}</h4>
                  <p className="text-zinc-400 text-sm">{songInfo.artist}</p>
                </div>
                <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-mono text-zinc-400 uppercase">
                  {songInfo.genre}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> {songInfo.bpm} BPM</span>
                <span>•</span>
                <span className="italic">{songInfo.vibe}</span>
              </div>

              <button
                onClick={generateMusic}
                disabled={isGenerating}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating 90s Track...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Cover</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {audioUrl && (
          <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
            <button
              onClick={togglePlay}
              className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">AI Generated Track</p>
              <p className="text-xs text-zinc-500">90 Seconds • Ready for Challenge</p>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        {error && (
          <div className="flex flex-col gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <div className="flex items-start gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
            {(error.includes("permission") || error.includes("spending cap")) && (
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => window.aistudio?.openSelectKey()}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-[10px] font-bold transition-all"
                >
                  Select API Key
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-zinc-500 hover:text-white text-center underline"
                >
                  Learn about Gemini API billing
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
