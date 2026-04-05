"use client";

import { AnimatePresence, motion } from "motion/react";
import { RefObject } from "react";

import { AvatarStatus } from "@/hooks/useHeyGenAvatar";

export function AvatarDisplay({
  videoRef,
  status,
  isSpeaking,
  error,
  onConnect,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: AvatarStatus;
  isSpeaking: boolean;
  error: string | null;
  onConnect: () => void;
}) {
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="relative flex items-center justify-center w-full rounded-2xl overflow-hidden bg-gray-100 aspect-video max-h-72">
      {/* Avatar video stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isConnected ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Overlay states */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          >
            {isConnecting ? (
              <>
                <div className="w-8 h-8 border-2 border-gray-400 border-t-black rounded-full animate-spin" />
                <span className="text-sm text-gray-500">
                  Connecting to avatar…
                </span>
              </>
            ) : status === "error" ? (
              <>
                <span className="text-sm text-red-500 text-center px-4">
                  {error ?? "Failed to connect to avatar"}
                </span>
                <button
                  onClick={onConnect}
                  className="text-sm font-medium px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-200 transition-colors"
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <button
                  onClick={onConnect}
                  className="text-sm font-medium px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-200 transition-colors"
                >
                  Start Avatar
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status badges */}
      {isConnected && (
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Speaking
            </motion.div>
          )}
          <div className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
        </div>
      )}
    </div>
  );
}
