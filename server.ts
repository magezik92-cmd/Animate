import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Real-time Jam Session State
  const sessions: Record<string, {
    id: string;
    name: string;
    users: Record<string, {
      id: string;
      name: string;
      instrument: string;
      color: string;
    }>;
    startTime: number;
    bpm: number;
  }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-session", ({ sessionId, userName, instrument }) => {
      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          id: sessionId,
          name: `Jam Session ${sessionId}`,
          users: {},
          startTime: Date.now(),
          bpm: 120,
        };
      }

      const colors = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ec4899"];
      const userColor = colors[Object.keys(sessions[sessionId].users).length % colors.length];

      sessions[sessionId].users[socket.id] = {
        id: socket.id,
        name: userName,
        instrument,
        color: userColor,
      };

      socket.join(sessionId);
      
      // Broadcast to others in the room
      io.to(sessionId).emit("session-update", sessions[sessionId]);
      
      console.log(`User ${userName} joined session ${sessionId}`);
    });

    socket.on("update-instrument", ({ sessionId, instrument }) => {
      if (sessions[sessionId]?.users[socket.id]) {
        sessions[sessionId].users[socket.id].instrument = instrument;
        io.to(sessionId).emit("session-update", sessions[sessionId]);
      }
    });

    socket.on("jam-event", ({ sessionId, type, data }) => {
      // Broadcast musical events (notes, beats, etc.) with server timestamp for sync
      socket.to(sessionId).emit("jam-event", {
        userId: socket.id,
        type,
        data,
        serverTime: Date.now()
      });
    });

    socket.on("disconnect", () => {
      for (const sessionId in sessions) {
        if (sessions[sessionId].users[socket.id]) {
          delete sessions[sessionId].users[socket.id];
          if (Object.keys(sessions[sessionId].users).length === 0) {
            delete sessions[sessionId];
          } else {
            io.to(sessionId).emit("session-update", sessions[sessionId]);
          }
        }
      }
      console.log("User disconnected:", socket.id);
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
