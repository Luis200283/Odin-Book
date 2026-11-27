"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type ChatMessage = {
  id: string;
  text: string;
  socketId: string;
  sentAt: string;
};

type AckResponse = {
  ok: boolean;
  error?: string;
};

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

export default function SocketTestPage() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pong, setPong] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", (connectionError) => {
      setConnected(false);
      setError(`Connection error: ${connectionError.message}`);
    });

    socket.on("welcome", (payload: { id: string; message: string }) => {
      console.log("[socket] welcome:", payload);
    });

    socket.on("chat message", (message: ChatMessage) => {
      setMessages((previous) => [...previous, message]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = input.trim();
    const socket = socketRef.current;

    if (!text || !socket) {
      return;
    }

    socket.emit("chat message", text, (response: AckResponse) => {
      if (!response.ok) {
        setError(response.error ?? "The server rejected the message");
      }
    });

    setInput("");
  }

  function sendPing() {
    socketRef.current?.emit("app:ping", (reply: string) => {
      setPong(reply);
    });
  }

  function toggleConnection() {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    if (socket.connected) {
      socket.disconnect();
    } else {
      socket.connect();
    }
  }

  return (
    <main className="mx-auto flex h-screen max-w-md flex-col gap-4 p-6 text-white">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Socket.IO Lab</h1>
        <span
          className={`flex items-center gap-2 text-sm ${
            connected ? "text-green-400" : "text-red-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-green-400" : "bg-red-400"
            }`}
          />
          {connected ? "connected" : "disconnected"}
        </span>
      </header>

      <p className="text-sm text-neutral-400">
        Open this page in two tabs. Messages are broadcast to every connected
        client.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <ul className="flex-1 space-y-2 overflow-y-auto rounded-md border border-neutral-700 p-3 text-sm">
        {messages.length === 0 && (
          <li className="text-neutral-500">No messages yet.</li>
        )}
        {messages.map((message) => (
          <li key={message.id} className="rounded-md bg-neutral-900 p-2">
            <p>{message.text}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {message.socketId.slice(0, 6)} ·{" "}
              {new Date(message.sentAt).toLocaleTimeString()}
            </p>
          </li>
        ))}
      </ul>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Write a message"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
        <button
          type="submit"
          disabled={!connected}
          className="rounded-md bg-white px-4 py-2 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <div className="flex gap-2">
        <button
          onClick={sendPing}
          disabled={!connected}
          className="flex-1 rounded-md border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-50"
        >
          Ping {pong ? `→ ${pong}` : ""}
        </button>
        <button
          onClick={toggleConnection}
          className="flex-1 rounded-md border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900"
        >
          {connected ? "Disconnect" : "Connect"}
        </button>
      </div>
    </main>
  );
}
