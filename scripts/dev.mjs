import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
let shuttingDown = false;
let children = [];

const processes = [
  {
    name: "api",
    command: "node",
    args: ["quicktrade-system-main/backend/server.js"],
  },
  {
    name: "frontend",
    command: "vite",
    args: [],
  },
];

children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: isWindows,
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;

    shuttingDown = true;
    for (const running of children) {
      if (running !== child && !running.killed) {
        running.kill();
      }
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
  });

  return child;
});

const stopAll = () => {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on("SIGINT", () => {
  stopAll();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(143);
});
