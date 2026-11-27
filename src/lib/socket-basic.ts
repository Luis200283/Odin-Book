import { createServer } from "http";
import { randomUUID } from "crypto";
import { Server } from "socket.io";
import { chatMessageSchema } from "./validation";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
const PORT = Number(process.env.SOCKET_PORT ?? process.env.PORT ?? 3001);

const httpServer = createServer();

const io = new Server(httpServer, {
  connectionStateRecovery: {},
  cors: {
    origin: CLIENT_ORIGIN,
  },
});

type chatMessage = {
  id: string;
  text: string;
  socketId: string;
  sentAt: string;
};

type Ack = (response: { ok: boolean; error?: string }) => void;

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.emit("welcome", {
    id: socket.id,
    message: "Connected to the Socket.IO server",
  });

  socket.on("app:ping", (callback?: (reply: string) => void) => {
    callback?.("pong");
  });

  socket.on("chat message", (rawMessage: unknown, callback?: Ack) => {
    const result = chatMessageSchema.safeParse(rawMessage);

    if (!result.success) {
      callback?.({
        ok: false,
        error: result.error.issues[0]?.message ?? "Invalid message",
      });
      return;
    }

    const message: chatMessage = {
      id: randomUUID(),
      text: result.data,
      socketId: socket.id,
      sentAt: new Date().toISOString(),
    };

    io.emit("chat message", message);
    callback?.({ ok: true });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] listening on http://localhost:${PORT}`);
});
