import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Play, Loader2, CheckCircle2, AlertCircle, Music2, Sparkles, Clock } from 'lucide-react';
import MusicSearchGenerator from './MusicSearchGenerator';

// Extend window for AI Studio API key selection
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const MODEL_NAME = "veo-3.1-generate-preview"; // Upgraded to support extension

export default function VideoGenerator() {
  const [mode, setMode] = useState<'challenge' | 'story'>('challenge');
  const [script, setScript] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [hasKey, setHasKey] = useState(false);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [targetDuration, setTargetDuration] = useState(30); // Default to 30s

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
        if (!selected) setShowKeyPrompt(true);
      }
    };
    checkKey();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
        setShowKeyPrompt(false);
      } catch (err) {
        console.error("Failed to open key selector:", err);
      }
    }
  };

  const generateVideo = async () => {
    if (!image) return;
    
    if (!hasKey) {
      await handleSelectKey();
    }

    setIsGenerating(true);
    setError(null);
    setStatus("Initiating video generation...");

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      // Helper for retrying operations on 500 errors
      const withRetry = async <T,>(fn: () => Promise<T>, retries = 3): Promise<T> => {
        try {
          return await fn();
        } catch (err: any) {
          const isRetryable = 
            err.message?.includes("500") || 
            err.message?.includes("Internal Server Error") || 
            err.message?.includes("HTTP 500") || 
            err.message?.includes("HTTP 429") ||
            err.message?.includes("RESOURCE_EXHAUSTED");
            
          if (retries > 0 && isRetryable) {
            console.warn(`Retrying operation due to error... (${retries} retries left): ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return withRetry(fn, retries - 1);
          }
          throw err;
        }
      };

      // Initial 7s generation
      let operation;
      const basePrompt = mode === 'story' 
        ? `Cinematic scenery story: ${script}. Start from the provided image and bring the story to life with high-quality visual storytelling.`
        : "A dynamic music challenge video with high energy, smooth transitions, and rhythmic movement inspired by the characters in the photo.";

      try {
        operation = await withRetry(() => ai.models.generateVideos({
          model: MODEL_NAME,
          prompt: basePrompt,
          image: {
            imageBytes: base64Data,
            mimeType: mimeType,
          },
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '9:16'
          }
        }));
      } catch (err: any) {
        if (err.message?.includes("spending cap") || err.message?.includes("RESOURCE_EXHAUSTED")) {
          throw new Error("Your Google Cloud project has reached its spending cap. Please check your billing settings in the Google Cloud Console or select a different API key.");
        }
        if (err.message?.includes("permission") || err.message?.includes("403") || err.message?.includes("not found")) {
          setHasKey(false);
          setShowKeyPrompt(true);
          throw new Error("API Key permission error. Please click 'Select API Key' and ensure you choose a key from a paid Google Cloud project.");
        }
        throw err;
      }

      const loadingMessages = [
        "Analyzing the vibe...",
        "Syncing the rhythm...",
        "Generating smooth transitions...",
        "Adding the hype...",
        "Finalizing your challenge video..."
      ];
      let messageIndex = 0;

      while (!operation.done) {
        setStatus(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await withRetry(() => ai.operations.getVideosOperation({ operation: operation }));
      }

      let currentVideo = operation.response?.generatedVideos?.[0]?.video;
      if (!currentVideo) throw new Error("No video generated");

      let currentDuration = 7;
      setVideoDuration(currentDuration);
      
      // Extension loop to reach the user-defined target duration
      const extensionPrompt = mode === 'story'
        ? `Continue the cinematic scenery story: ${script}. Maintain visual consistency and evolve the narrative smoothly.`
        : "The music challenge continues with evolving dance moves, increasing energy, and smooth rhythmic transitions.";

      while (currentDuration < targetDuration) {
        setStatus(`Extending video: ${currentDuration}s / ${targetDuration}s...`);
        
        // Add a small delay to ensure the previous video is "processed" on the server
        await new Promise(resolve => setTimeout(resolve, 5000));

        try {
          // Re-initialize AI client to ensure fresh session/key
          const apiKeyLoop = process.env.API_KEY || process.env.GEMINI_API_KEY;
          const aiLoop = new GoogleGenAI({ apiKey: apiKeyLoop });
          
          operation = await withRetry(() => aiLoop.models.generateVideos({
            model: MODEL_NAME,
            prompt: extensionPrompt,
            video: currentVideo,
            config: {
              numberOfVideos: 1,
              resolution: '720p',
              aspectRatio: '9:16'
            }
          }));

          while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await withRetry(() => aiLoop.operations.getVideosOperation({ operation: operation }));
          }

          const nextVideo = operation.response?.generatedVideos?.[0]?.video;
          if (!nextVideo) throw new Error("Failed to extend video");
          
          currentVideo = nextVideo;
          currentDuration += 7;
          setVideoDuration(currentDuration);
        } catch (err: any) {
          if (err.message?.includes("spending cap") || err.message?.includes("RESOURCE_EXHAUSTED")) {
            setError("Extension stopped: Your project has reached its spending cap. You can still use the video generated so far.");
          } else {
            console.error("Extension failed at " + currentDuration + "s:", err);
          }
          break; 
        }
      }

      setStatus("Downloading final extended video...");
      const downloadLink = currentVideo.uri;
      const downloadKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
      
      const response = await withRetry(async () => {
        const res = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': downloadKey,
          },
        });
        if (!res.ok) {
          // Only retry on 500s or 429s, don't retry on 404s
          if (res.status >= 500 || res.status === 429) {
            const text = await res.text().catch(() => "");
            throw new Error(`HTTP ${res.status}: ${text}`);
          }
        }
        return res;
      });

      if (!response.ok) {
        if (response.status === 404) {
          setHasKey(false);
          throw new Error("API Key session expired. Please select your key again.");
        }
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to download video: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoDuration(currentDuration);
      setStatus("Generation complete!");
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("spending cap") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        setHasKey(false);
        setShowKeyPrompt(true);
        setError("Your Google Cloud project has reached its spending cap. Please check your billing settings in the Google Cloud Console or select a different API key.");
      } else if (err.message?.includes("permission") || err.message?.includes("403") || err.message?.includes("not found")) {
        setHasKey(false);
        setShowKeyPrompt(true);
        setError("API Key permission error. Paid models (Veo/Lyria) require a selected API key from a paid Google Cloud project with billing enabled.");
      } else {
        setError(err.message || "An unexpected error occurred during generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="bg-zinc-900 p-1 rounded-2xl border border-zinc-800 flex gap-1">
          <button
            onClick={() => setMode('challenge')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              mode === 'challenge' 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Music2 className="w-4 h-4" />
            Music Challenge
          </button>
          <button
            onClick={() => setMode('story')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              mode === 'story' 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Scenery Story
          </button>
        </div>
      </div>

      {showKeyPrompt && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <p className="text-sm text-orange-200">
              Paid models (Veo/Lyria) require a selected API key from a paid Google Cloud project.
            </p>
          </div>
          <button 
            onClick={handleSelectKey}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
          >
            Select API Key
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Music Search or Script Input & Duration */}
        <div className="lg:col-span-1 space-y-4">
          {mode === 'challenge' ? (
            <MusicSearchGenerator onMusicGenerated={(url) => setAudioUrl(url)} />
          ) : (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Story Script</h3>
                  <p className="text-xs text-zinc-500">Describe your cinematic journey</p>
                </div>
              </div>
              
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Once upon a time, in a land far away... Describe the scenery, the atmosphere, and the events you want to see unfold."
                className="flex-1 w-full bg-black border border-zinc-800 rounded-xl p-4 text-zinc-300 text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none min-h-[200px]"
              />
              
              <div className="bg-orange-500/5 border border-orange-500/10 p-3 rounded-xl">
                <p className="text-[10px] text-orange-500/70 leading-relaxed">
                  Tip: Be descriptive about lighting, weather, and movement for the best cinematic results.
                </p>
              </div>
            </div>
          )}

          {/* Duration Slider */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Video Length</h3>
                  <p className="text-xs text-zinc-500">Target duration for extension</p>
                </div>
              </div>
              <span className="text-orange-500 font-mono font-bold">{targetDuration}s</span>
            </div>
            
            <input
              type="range"
              min="7"
              max="600"
              step="7"
              value={targetDuration}
              onChange={(e) => setTargetDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>7s</span>
              <span>300s</span>
              <span>600s</span>
            </div>
          </div>
        </div>

        {/* Middle Column: Upload & Video Control */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative group aspect-[9/16] bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center overflow-hidden transition-colors hover:border-orange-500">
            {image ? (
              <>
                <img src={image} alt="Preview" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-red-500 transition-colors"
                  >
                    <AlertCircle className="w-5 h-5 text-white" />
                  </button>
                  <Sparkles className="w-12 h-12 text-orange-500 mb-2" />
                  <p className="text-white font-medium">Photo Ready</p>
                </div>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center space-y-4 p-8">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-zinc-400 group-hover:text-orange-500" />
                </div>
                <div className="text-center">
                  <p className="text-zinc-300 font-medium">Upload a Photo</p>
                  <p className="text-zinc-500 text-sm">Portrait orientation works best</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          <button
            onClick={generateVideo}
            disabled={!image || isGenerating}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              !image || isGenerating 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                {mode === 'challenge' ? (
                  <>
                    <Play className="w-6 h-6 fill-current" />
                    <span>Animate Challenge</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    <span>Create Story</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>

        {/* Right Column: Result Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="aspect-[9/16] bg-black rounded-2xl border border-zinc-800 flex flex-col items-center justify-center overflow-hidden relative shadow-2xl">
            <AnimatePresence mode="wait">
              {videoUrl ? (
                <div className="relative w-full h-full">
                  <motion.video
                    key="video"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                  {audioUrl && (
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                      <Music2 className="w-3 h-3 text-orange-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Audio Synced</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{videoDuration}s Visual</span>
                  </div>
                </div>
              ) : isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center space-y-6 p-8 text-center"
                >
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <Music2 className="w-10 h-10 text-orange-500 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Creating Magic</h3>
                    <p className="text-zinc-400 text-sm animate-pulse">{status}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center p-8 space-y-4"
                >
                  <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto border border-zinc-800">
                    <Play className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-zinc-500">Your generated video will appear here</p>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col gap-3 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-200 text-xs leading-relaxed">{error}</p>
                </div>
                {(error.includes("permission") || error.includes("spending cap")) && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handleSelectKey}
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Select API Key
                    </button>
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/billing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-zinc-400 hover:text-white text-center underline"
                    >
                      Learn about Gemini API billing
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {videoUrl && (
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div>
                <p className="text-green-200 font-medium">Challenge Generated!</p>
                <p className="text-green-500/70 text-sm">Ready to share on social media.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
