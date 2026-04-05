import { useEffect, useRef, useState } from "react";

import { Message } from "@/lib/types";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/lib/utils";

export function useWebsocket({
  url,
  onNewAudio,
  onAudioDone,
  onAudioComplete,
}: {
  url?: string;
  onNewAudio?: (audio: Int16Array<ArrayBuffer>) => void;
  onAudioDone?: () => void;
  /** Called once per response with the full concatenated PCM buffer */
  onAudioComplete?: (audio: ArrayBuffer) => void;
} = {}) {
  url =
    url ??
    process.env.NEXT_PUBLIC_WEBSOCKET_ENDPOINT ??
    "ws://localhost:8000/ws";
  const [isReady, setIsReady] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [agentName, setAgentName] = useState<string | null>(null);
  const websocket = useRef<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const audioBuffer = useRef<Int16Array[]>([]);

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => {
      setIsReady(true);
    });
    ws.addEventListener("close", () => {
      setIsReady(false);
    });
    ws.addEventListener("error", (event) => {
      setIsReady(false);
      setIsLoading(false);
      console.error("Websocket error", event);
    });
    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "history.updated") {
        if (data.inputs[data.inputs.length - 1].role !== "user") {
          setIsLoading(false);
        }
        setHistory(data.inputs);
        if (data.agent_name) {
          setAgentName(data.agent_name);
        }
      } else if (data.type === "response.audio.delta") {
        const audioData = new Int16Array(base64ToArrayBuffer(data.delta));
        audioBuffer.current.push(audioData);
        if (typeof onNewAudio === "function") {
          onNewAudio(audioData);
        }
      } else if (data.type === "audio.done") {
        if (typeof onAudioComplete === "function" && audioBuffer.current.length > 0) {
          const totalLength = audioBuffer.current.reduce((acc, c) => acc + c.length, 0);
          const merged = new Int16Array(totalLength);
          let offset = 0;
          for (const chunk of audioBuffer.current) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          onAudioComplete(merged.buffer);
        }
        audioBuffer.current = [];
        if (typeof onAudioDone === "function") {
          onAudioDone();
        }
      }
    });

    websocket.current = ws;
  }, [url, onNewAudio, onAudioDone, onAudioComplete]);

  useEffect(() => {
    return () => {
      websocket.current?.close();
    };
  }, []);

  function sendTextMessage(message: string) {
    setIsLoading(true);
    const newHistory = [
      ...history,
      {
        role: "user",
        content: message,
        type: "message",
      } as Message,
    ];
    setHistory(newHistory);
    websocket.current?.send(
      JSON.stringify({
        type: "history.update",
        inputs: newHistory,
      })
    );
  }

  function resetHistory() {
    setHistory([]);
    setIsLoading(false);
    setAgentName(null);
    audioBuffer.current = [];
    websocket.current?.send(
      JSON.stringify({
        type: "history.update",
        inputs: [],
        reset_agent: true,
      })
    );
  }
  function sendAudioMessage(audio: Int16Array<ArrayBuffer>) {
    if (!websocket.current) {
      throw new Error("Websocket not connected");
    }
    websocket.current.send(
      JSON.stringify({
        type: "history.update",
        inputs: history,
      })
    );
    websocket.current.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        delta: arrayBufferToBase64(audio.buffer),
      })
    );
    websocket.current.send(
      JSON.stringify({
        type: "input_audio_buffer.commit",
      })
    );
  }

  return {
    isReady,
    sendTextMessage,
    sendAudioMessage,
    history,
    resetHistory,
    agentName,
    isLoading,
  };
}
