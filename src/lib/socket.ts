import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path, { join } from "node:path";
import { Server } from "socket.io";
import { prisma } from "../db/client";
import { Prisma } from "../generated/prisma/client";
import { availableParallelism } from "node:os";
import cluster from "node:cluster";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";

if (cluster.isPrimary) {
  const numCPUs = availableParallelism();

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i,
    });
  }
  setupPrimary();
} else {
  const app = express(); // herramientas
  const server = createServer(app); //servidor
  const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter(),
  });

  const _direname = path.dirname(fileURLToPath(import.meta.url));

  app.get("/", (req, res) => {
    res.sendFile(join(_direname, "index.html"));
  });

  io.on("connection", async (socket) => {
    socket.on("chat message", async (msg, clientOffset, callback) => {
      let result;
      try {
        result = await prisma.message.create({
          data: {
            client_offset: clientOffset,
            content: msg,
          },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          callback();
        }
        return;
      }

      io.emit("chat message", msg, result?.id);
      callback();
    });

    if (!socket.recovered) {
      try {
        const rows = await prisma.message.findMany({
          where: {
            id: { gt: Number(socket.handshake.auth.serverOffset) || 0 },
          },
          select: { id: true, content: true },
          orderBy: { id: "asc" },
        });

        for (const row of rows) {
          socket.emit("chat message", row.content, row.id);
        }
      } catch (error) {}
    }
  });

  const port = process.env.PORT;

  server.listen(port, () => {
    console.log(`server running at http://localhost:3000`);
  });
}
