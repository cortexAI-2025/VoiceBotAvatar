"use client";

import { LiveAvatarSession, SessionEvent } from "@heygen/liveavatar-web-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

export type AvatarStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export function useHeyGenAvatar() {
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<AvatarStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      const res = await fetch("/api/heygen-token", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to get HeyGen session token");
      }
      const { session_token } = await res.json();

      const session = new LiveAvatarSession(session_token);
      sessionRef.current = session;

      session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
        if (state === "CONNECTED") setStatus("connected");
        else if (state === "CONNECTING") setStatus("connecting");
        else if (state === "DISCONNECTED") setStatus("disconnected");
        else if (state === "INACTIVE") setStatus("idle");
      });

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        if (videoRef.current) {
          session.attach(videoRef.current);
        }
      });

      await session.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("error");
    }
  }, []);

  const disconnect = useCallback(async () => {
    await sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus("idle");
  }, []);

  // Send the avatar a text message to speak (uses HeyGen TTS)
  const speakText = useCallback((text: string) => {
    sessionRef.current?.message(text);
  }, []);

  // Forward raw PCM audio (Int16 at 24 kHz) so the avatar lip-syncs.
  // The SDK's repeatAudio expects a base64-encoded string.
  const speakAudio = useCallback((audio: ArrayBuffer) => {
    const bytes = new Uint8Array(audio);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    sessionRef.current?.repeatAudio(base64);
  }, []);

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.stop().catch(() => {});
    };
  }, []);

  return {
    videoRef,
    status,
    error,
    connect,
    disconnect,
    speakText,
    speakAudio,
    interrupt,
  };
}
