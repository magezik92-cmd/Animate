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
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [hasKey, setHasKey] = useState(false);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      // Initial 7s generation
      let operation;
      try {
        operation = await ai.models.generateVideos({
          model: MODEL_NAME,
          prompt: "A dynamic music challenge video with high energy, smooth transitions, and rhythmic movement inspired by the characters in the photo.",
          image: {
            imageBytes: base64Data,
            mimeType: mimeType,
          },
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '9:16'
          }
        });
      } catch (err: any) {
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
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No video generated");

      setStatus("Downloading video...");
      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': process.env.GEMINI_API_KEY || '',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setHasKey(false);
          throw new Error("API Key session expired. Please select your key again.");
        }
        throw new Error("Failed to download video");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoDuration(7);
      setStatus("Generation complete!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
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
        {/* Left Column: Music Search */}
        <div className="lg:col-span-1">
          <MusicSearchGenerator onMusicGenerated={(url) => setAudioUrl(url)} />
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
                <Play className="w-6 h-6 fill-current" />
                <span>Animate Challenge</span>
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
              <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3 backdrop-blur-md">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-200 text-xs">{error}</p>
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
