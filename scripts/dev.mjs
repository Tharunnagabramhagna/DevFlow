import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';

const rootDir = process.cwd();
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function parseDatabaseTarget() {
  const envPath = path.join(rootDir, '.env');
  let databaseUrl = process.env.DATABASE_URL || '';
  if (!databaseUrl && fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
    if (match) {
      databaseUrl = match[1];
    }
  }
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname || '127.0.0.1',
      port: Number(url.port) || 5432,
    };
  } catch {
    return { host: '127.0.0.1', port: 5433 };
  }
}

function canConnectTcp(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (ok) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function ensureDockerRunning() {
  try {
    execSync('docker info', { cwd: rootDir, stdio: 'ignore' });
    return;
  } catch {
    // Docker daemon is not running yet; attempt to start Docker Desktop automatically.
  }

  console.log('[dev] Docker daemon is not running. Starting Docker Desktop (this may take up to 90s)...');
  try {
    execSync('docker desktop start --timeout 90', { cwd: rootDir, stdio: 'inherit' });
    execSync('docker info', { cwd: rootDir, stdio: 'ignore' });
  } catch {
    console.error(
      '[dev] Could not start Docker Desktop automatically. Please open the Docker Desktop app, wait until Engine running appears, then re-run "npm run dev:all".'
    );
    process.exit(1);
  }
}

async function ensureDatabaseReady() {
  const { host, port } = parseDatabaseTarget();
  if (await canConnectTcp(host, port)) {
    console.log(`[dev] PostgreSQL is reachable at ${host}:${port}`);
    return;
  }

  await ensureDockerRunning();

  console.log(`[dev] PostgreSQL not reachable at ${host}:${port}. Starting Docker Compose postgres...`);
  try {
    execSync('docker compose up -d postgres', { cwd: rootDir, stdio: 'inherit' });
  } catch {
    console.error(
      `[dev] Could not start Docker PostgreSQL on ${host}:${port}. Verify Docker Desktop is running and re-run "npm run dev:all".`
    );
    process.exit(1);
  }

  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (await canConnectTcp(host, port)) {
      console.log(`[dev] PostgreSQL is ready at ${host}:${port}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.error(
    `[dev] Timed out waiting for PostgreSQL on ${host}:${port}. Check "docker compose logs postgres".`
  );
  process.exit(1);
}

function startChild(name, args) {
  const child = isWindows
    ? spawn('cmd.exe', ['/d', '/s', '/c', `${npmCmd} ${args.join(' ')}`], {
        cwd: rootDir,
        stdio: ['inherit', 'pipe', 'pipe'],
      })
    : spawn(npmCmd, args, {
        cwd: rootDir,
        stdio: ['inherit', 'pipe', 'pipe'],
      });

  const prefixStream = (stream, target) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        target.write(`[${name}] ${line}\n`);
      }
    });
    stream.on('end', () => {
      if (buffer.length > 0) {
        target.write(`[${name}] ${buffer}\n`);
      }
    });
  };

  prefixStream(child.stdout, process.stdout);
  prefixStream(child.stderr, process.stderr);
  return child;
}

async function main() {
  await ensureDatabaseReady();

  const backend = startChild('backend', ['run', 'dev', '--prefix', 'backend']);
  const frontend = startChild('frontend', ['run', 'dev', '--prefix', 'frontend']);

  let shuttingDown = false;
  const shutdown = (exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    backend.kill('SIGINT');
    frontend.kill('SIGINT');
    setTimeout(() => process.exit(exitCode), 300);
  };

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  backend.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[dev] backend exited with code ${code ?? 1}`);
      shutdown(code ?? 1);
    }
  });
  frontend.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[dev] frontend exited with code ${code ?? 1}`);
      shutdown(code ?? 1);
    }
  });
}

main().catch((err) => {
  console.error('[dev] Fatal error:', err);
  process.exit(1);
});

