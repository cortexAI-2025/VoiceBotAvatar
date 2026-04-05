"use client";

import AudioChat from "@/components/AudioChat";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { ChatHistory } from "@/components/ChatDialog";
import { Composer } from "@/components/Composer";
import { Header } from "@/components/Header";
import { useAudio } from "@/hooks/useAudio";
import { useHeyGenAvatar } from "@/hooks/useHeyGenAvatar";
import { useWebsocket } from "@/hooks/useWebsocket";
import { useCallback, useState } from "react";

import "./styles.css";

export default function Home() {
  const [prompt, setPrompt] = useState("");

  const {
    videoRef,
    status: avatarStatus,
    error: avatarError,
    connect: connectAvatar,
    speakAudio,
    interrupt: interruptAvatar,
  } = useHeyGenAvatar();

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
      speakAudio(audio);
    },
    [speakAudio]
  );

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
    interruptAvatar();
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

      {/* Avatar video panel */}
      <div className="w-full max-w-lg px-4 pt-2 pb-1">
        <AvatarDisplay
          videoRef={videoRef}
          status={avatarStatus}
          error={avatarError}
          onConnect={connectAvatar}
        />
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
