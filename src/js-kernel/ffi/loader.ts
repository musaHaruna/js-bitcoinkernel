import path from "path";
import fs from "fs";
import koffi from "koffi";
import { fileURLToPath } from "url";

/*
 * ESM Compatibility Helpers
 *
 * Node.js ES Modules do not provide __dirname by default. This section
 * reconstructs __dirname and __filename so that filesystem operations
 * behave consistently across ESM and CommonJS environments.
*/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* 
 * Platform Abstraction Layer
 *
 * Different operating systems ship different dynamic library formats:
 *
 * - Windows: .dll
 * - macOS:   .dylib
 * - Linux:   .so
 *
 * This function defines the expected binary name patterns for the current
 * runtime platform, enabling platform-agnostic library resolution.
*/

function getPlatformPattern(): string[] {
  if (process.platform === "win32") {
    return ["bitcoinkernel.dll"];
  }

  if (process.platform === "darwin") {
    return ["libbitcoinkernel.dylib"];
  }

  return ["libbitcoinkernel.so"];
}

/*
 * Development Mode Binary Resolution
 * 
 * In development environments, compiled binaries may exist in multiple
 * local build directories depending on the build system in use.
 *
 * This resolver searches common output directories for a compatible
 * Bitcoin Kernel dynamic library and returns the first match.
 *
 * Expected search locations:
 * - ./lib
 * - ./build
 * - ./build/bitcoin-build/lib
 * - ./build/bitcoin-build/bin
 */

function findDevLib(): string {
  const candidates = [
    path.resolve(process.cwd(), "lib"),
    path.resolve(process.cwd(), "build"),
    path.resolve(process.cwd(), "build/bitcoin-build/lib"),
    path.resolve(process.cwd(), "build/bitcoin-build/bin"),
  ];

  const patterns = getPlatformPattern();

  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      if (patterns.some((p) => file.includes(p))) {
        return path.join(dir, file);
      }
    }
  }

  throw new Error(
    "Development mode: Bitcoin Kernel library not found in expected build directories."
  );
}

/* 
 * Production Mode Binary Resolution
 *
 * In production (packaged/distributed builds), native binaries are expected
 * to be bundled inside the package under the `/binaries` directory.
 *
 * This resolver:
 * - Validates the existence of the binaries directory
 * - Searches for a platform-compatible dynamic library
 * - Returns the first matching binary
 */

function findProdLib(): string {
  const patterns = getPlatformPattern();
  const base = path.resolve(__dirname, "../binaries");

  if (!fs.existsSync(base)) {
    throw new Error(
      "Production mode: binaries directory is missing from the distributed package."
    );
  }

  const files = fs.readdirSync(base);

  for (const file of files) {
    if (patterns.some((p) => file.includes(p))) {
      return path.join(base, file);
    }
  }

  throw new Error(
    "Production mode: no compatible Bitcoin Kernel binary found in packaged binaries directory."
  );
}

/* 
 * Environment-Aware Library Resolver
 * 
 *
 * Automatically determines whether the runtime is:
 *
 * 1. If a packaged `/binaries` directory exists → use production resolver
 * 2. Otherwise → fall back to development resolver
 */

function resolveLib(): string {
  const prodBinaryDir = path.resolve(__dirname, "../binaries");

  if (fs.existsSync(prodBinaryDir)) {
    return findProdLib();
  }

  return findDevLib();
}

/* 
 * Native Library Loader
 *
 * Loads the platform-specific Bitcoin Kernel dynamic library using koffi.
 *
 * The resolved binary path is determined at runtime based on:
 * - operating system
 * - execution environment (dev vs production)
 *
 * This exported handle is used for all subsequent native FFI bindings.
 */

export const lib = koffi.load(resolveLib());