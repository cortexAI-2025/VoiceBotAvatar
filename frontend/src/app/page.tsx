"use client";

import AudioChat from "@/components/AudioChat";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { ChatHistory } from "@/components/ChatDialog";
import { Composer } from "@/components/Composer";
import { Header } from "@/components/Header";
import { LocalAvatarDisplay } from "@/components/LocalAvatarDisplay";
import { useAudio } from "@/hooks/useAudio";
import { useHeyGenAvatar } from "@/hooks/useHeyGenAvatar";
import { useWebsocket } from "@/hooks/useWebsocket";
import { useCallback, useState } from "react";

import "./styles.css";

// Use the HeyGen cloud avatar only when the API key is injected at build time.
// Falls back to the fully local canvas avatar otherwise.
const USE_HEYGEN =
  Boolean(process.env.NEXT_PUBLIC_HEYGEN_ENABLED) ||
  process.env.NODE_ENV === "production"; // override in .env.local

export default function Home() {
  const [prompt, setPrompt] = useState("");

  // ── HeyGen avatar (optional cloud) ─────────────────────────────────
  const {
    videoRef,
    status: avatarStatus,
    isSpeaking,
    error: avatarError,
    connect: connectAvatar,
    speakAudio,
    interrupt: interruptAvatar,
  } = useHeyGenAvatar();

  // ── Audio (recording + local playback) ─────────────────────────────
  const {
    isReady: audioIsReady,
    playAudio,
    startRecording,
    stopRecording,
    stopPlaying,
    frequencies,
    playbackFrequencies,
  } = useAudio();

  // Forward the complete PCM buffer to HeyGen so the avatar lip-syncs
  const handleAudioComplete = useCallback(
    (audio: ArrayBuffer) => {
      if (USE_HEYGEN) speakAudio(audio);
    },
    [speakAudio]
  );

  // ── WebSocket → agent backend ───────────────────────────────────────
  const {
    isReady: websocketReady,
    sendAudioMessage,
    sendTextMessage,
    history: messages,
    resetHistory,
    isLoading,
    agentName,
  } = useWebsocket({
    onNewAudio: playAudio,
    onAudioComplete: handleAudioComplete,
  });

  function handleSubmit() {
    setPrompt("");
    sendTextMessage(prompt);
  }

  async function handleStopPlaying() {
    if (USE_HEYGEN) interruptAvatar();
    await stopPlaying();
  }

  return (
    <div className="w-full h-dvh flex flex-col items-center">
      <Header
        agentName={agentName ?? ""}
        playbackFrequencies={playbackFrequencies}
        stopPlaying={handleStopPlaying}
        resetConversation={resetHistory}
      />

      {/* ── Avatar panel ────────────────────────────────────────────── */}
      <div className="w-full max-w-lg px-4 pt-2 pb-1">
        {USE_HEYGEN ? (
          <AvatarDisplay
            videoRef={videoRef}
            status={avatarStatus}
            isSpeaking={isSpeaking}
            error={avatarError}
            onConnect={connectAvatar}
          />
        ) : (
          <LocalAvatarDisplay
            frequencies={playbackFrequencies}
            isActive={isLoading || playbackFrequencies.some((v) => v > 0.01)}
            agentName={agentName ?? undefined}
          />
        )}
      </div>

      <ChatHistory messages={messages} isLoading={isLoading} />
      <Composer
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        audioChat={
          <AudioChat
            frequencies={frequencies}
            isReady={websocketReady && audioIsReady}
            startRecording={startRecording}
            stopRecording={stopRecording}
            sendAudioMessage={sendAudioMessage}
          />
        }
      />
    </div>
  );
}
