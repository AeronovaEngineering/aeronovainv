import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// 🔐 Ajouter les en-têtes de sécurité
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // 🔐 CSP (Content Security Policy)
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
    "style-src 'self' 'unsafe-inline' https:; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data: https:; " +
    "connect-src 'self' https: wss:;"
  );
  
  // 🔐 Empêcher le MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // 🔐 Protection XSS
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // 🔐 Empêcher le clickjacking
  headers.set('X-Frame-Options', 'DENY');
  
  // 🔐 Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 🔐 HSTS (pour HTTPS)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // 🔐 Permissions Policy
  headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const secureResponse = await normalizeCatastrophicSsrResponse(response);
      return addSecurityHeaders(secureResponse);
    } catch (error) {
      console.error(error);
      const errorResponse = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return addSecurityHeaders(errorResponse);
    }
  },
};