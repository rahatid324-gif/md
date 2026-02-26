/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  History, 
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Signal {
  type: "BUY" | "SELL";
  confidence: number;
  timeframe: string;
  validity: string;
  reasoning: string;
  timestamp: string;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null);
  const [history, setHistory] = useState<Signal[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("otc_signal_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("otc_signal_history", JSON.stringify(history));
  }, [history]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setError(null);
        setCurrentSignal(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const predictSignal = async () => {
    if (!image) {
      setError("Please upload a screenshot first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = image.split(",")[1];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data,
                },
              },
              {
                text: "Act as a professional OTC trading expert. Analyze this chart for a 'SURE SHOT' signal. Predict if the next move is a BUY or SELL. Provide deep technical reasoning (support/resistance, candle patterns, trend) and a confidence score. Aim for the highest possible accuracy.",
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: "The signal type: BUY or SELL",
              },
              confidence: {
                type: Type.NUMBER,
                description: "Confidence percentage (0-100)",
              },
              timeframe: {
                type: Type.STRING,
                description: "The chart timeframe (e.g., 1M, 5M)",
              },
              validity: {
                type: Type.STRING,
                description: "How long the signal is valid (e.g., 5 min)",
              },
              reasoning: {
                type: Type.STRING,
                description: "Technical analysis reasoning for the signal",
              },
            },
            required: ["type", "confidence", "timeframe", "validity", "reasoning"],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      const newSignal: Signal = {
        ...result,
        timestamp: new Date().toLocaleTimeString(),
      };

      setCurrentSignal(newSignal);
      setHistory((prev) => [newSignal, ...prev].slice(0, 20)); // Keep last 20
    } catch (err) {
      console.error(err);
      setError("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-[#00FFC6]/30">
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col min-h-screen">
        {/* App Title */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#00FFC6] tracking-tight">
            OTC Signal Bot
          </h1>
          <p className="text-gray-400 text-sm mt-1">AI-Powered Market Analysis</p>
        </header>

        {/* Screenshot Preview Area */}
        <div className="relative aspect-[4/3] w-full bg-[#1E1E1E] rounded-2xl border border-white/5 overflow-hidden mb-6 group">
          <AnimatePresence mode="wait">
            {image ? (
              <motion.img
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={image}
                alt="Chart Preview"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col items-center justify-center text-gray-500"
              >
                <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">No screenshot uploaded</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Overlay for upload */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <div className="bg-[#00FFC6] text-[#121212] p-3 rounded-full shadow-lg">
              <Upload className="w-6 h-6" />
            </div>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-14 bg-[#00FFC6] text-[#121212] font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#00FFC6]/10"
          >
            <Upload className="w-5 h-5" />
            Upload Screenshot
          </button>

          <button
            onClick={predictSignal}
            disabled={!image || loading}
            className={cn(
              "w-full h-14 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg",
              !image || loading 
                ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                : "bg-[#FF6B6B] text-white hover:brightness-110 active:scale-[0.98] shadow-[#FF6B6B]/10"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Market...
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Predict Signal
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Signal Output Card */}
        <div className="mb-8">
          <AnimatePresence mode="wait">
            {currentSignal ? (
              <motion.div
                key="signal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1E1E1E] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col items-center text-center"
              >
                <div className={cn(
                  "text-5xl font-black mb-2 tracking-tighter",
                  currentSignal.type === "BUY" ? "text-[#00FFC6]" : "text-[#FF6B6B]"
                )}>
                  {currentSignal.type}
                </div>

                {currentSignal.confidence >= 90 && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-[#00FFC6] text-[#121212] text-[10px] font-black px-2 py-0.5 rounded-full mb-4 uppercase tracking-tighter"
                  >
                    🔥 SURE SHOT
                  </motion.div>
                )}
                
                <div className="flex items-center gap-2 text-gray-300 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00FFC6]" />
                  <span className="text-lg font-semibold">
                    Confidence: {currentSignal.confidence}%
                  </span>
                </div>
                
                <div className="text-gray-500 text-xs mb-4">
                  Timeframe: {currentSignal.timeframe} | Valid: {currentSignal.validity}
                </div>

                <div className="w-full p-3 bg-[#121212] rounded-xl border border-white/5 text-left">
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Technical Reasoning</div>
                  <p className="text-xs text-gray-400 leading-relaxed italic">
                    "{currentSignal.reasoning}"
                  </p>
                </div>
              </motion.div>
            ) : !loading && (
              <div className="bg-[#1E1E1E]/50 p-8 rounded-2xl border border-dashed border-white/10 flex flex-col items-center text-center text-gray-600">
                <TrendingUp className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Signal will appear here after analysis</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Past Signals History */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4 px-1">
            <History className="w-4 h-4 text-[#00FFC6]" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
              Signal History
            </h2>
          </div>
          
          <div className="flex-1 bg-[#1E1E1E] rounded-2xl border border-white/5 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {history.length > 0 ? (
                history.map((sig, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={`${sig.timestamp}-${i}`}
                    className="flex items-center justify-between p-3 bg-[#121212] rounded-xl border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        sig.type === "BUY" ? "bg-[#00FFC6]" : "bg-[#FF6B6B]"
                      )} />
                      <div>
                        <div className={cn(
                          "font-bold text-sm",
                          sig.type === "BUY" ? "text-[#00FFC6]" : "text-[#FF6B6B]"
                        )}>
                          {sig.type}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase font-medium">
                          {sig.timestamp}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-300">
                        {sig.confidence}%
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {sig.timeframe}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 py-10">
                  <p className="text-xs italic">No history available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
