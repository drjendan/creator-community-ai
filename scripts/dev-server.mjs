import net from "node:net";
import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = 3000;

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.setTimeout(750);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

if (await isPortOpen()) {
  console.log(`PodcastOS is already running at http://localhost:${port}`);
  process.exit(0);
}

const next = spawn(
  process.execPath,
  ["./node_modules/next/dist/bin/next", "dev", "-p", String(port)],
  {
    cwd: process.cwd(),
    stdio: "inherit"
  }
);

next.once("error", (error) => {
  console.error("Unable to start PodcastOS:", error.message);
  process.exit(1);
});

next.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
