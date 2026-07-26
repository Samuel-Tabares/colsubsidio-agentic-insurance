import { execSync, spawnSync } from "node:child_process";
import net from "node:net";

/**
 * Arranca Postgres local SOLO cuando se levanta el server de Colsubsidio.
 *
 * Si el puerto ya responde (Postgres arriba, o Docker, o Supabase remoto), no
 * hace nada. Si está apagado y estamos en macOS con Homebrew, lo enciende con
 * `brew services run` — que lo prende para esta sesión SIN registrarlo en el
 * arranque del sistema. En cualquier otro entorno solo avisa y deja continuar:
 * nunca bloquea el arranque del server.
 */

const HOST = "localhost";
const PORT = 5432;
const BREW_SVC = "postgresql@15";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tcpUp(host, port, timeout = 800) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (ok) => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeout);
    sock.once("connect", () => done(true));
    sock.once("timeout", () => done(false));
    sock.once("error", () => done(false));
  });
}

function hasBrew() {
  return spawnSync("brew", ["--version"], { stdio: "ignore" }).status === 0;
}

async function main() {
  if (await tcpUp(HOST, PORT)) {
    console.log(`[db] Postgres ya está arriba en ${HOST}:${PORT} ✓`);
    return;
  }

  if (process.platform !== "darwin" || !hasBrew()) {
    console.warn(
      `[db] Postgres no responde en ${PORT} y no puedo arrancarlo aquí ` +
        `(sin Homebrew). Arráncalo tú y reintenta.`
    );
    return;
  }

  console.log(`[db] Postgres apagado — arrancando ${BREW_SVC} (solo esta sesión, sin auto-boot)…`);
  try {
    execSync(`brew services run ${BREW_SVC}`, { stdio: "inherit" });
  } catch {
    console.warn(`[db] No pude arrancar ${BREW_SVC}. Manual: brew services run ${BREW_SVC}`);
    return;
  }

  for (let i = 0; i < 30; i++) {
    if (await tcpUp(HOST, PORT)) {
      console.log(`[db] Postgres listo ✓`);
      return;
    }
    await sleep(500);
  }
  console.warn(`[db] Postgres arrancó pero tardó en responder; el server intentará conectar igual.`);
}

main();
