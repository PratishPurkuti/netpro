import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import https from "node:https";
import http from "node:http";
import { decrypt } from "./auth";
import { settings } from "./db";
export function privateAddress(address: string) {
  if (address.includes(":")) {
    const a = address.toLowerCase();
    return (
      (!a.startsWith("2") && !a.startsWith("3")) ||
      a.startsWith("2001:db8") ||
      a.startsWith("2002:") ||
      a.startsWith("2001:0:") ||
      a.startsWith("2001::")
    );
  }
  const p = address.split(".").map(Number);
  return (
    p[0] === 0 ||
    p[0] === 10 ||
    p[0] === 127 ||
    p[0] >= 224 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    (p[0] === 198 && [18, 19, 51].includes(p[1])) ||
    (p[0] === 203 && p[1] === 0) ||
    (p[0] === 192 && p[1] === 0)
  );
}
export async function endpoint(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid AI base URL.");
  }
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      "Endpoint cannot contain credentials, query parameters, or fragments.",
    );
  const local = process.env.ALLOW_PRIVATE_AI === "true";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    throw new Error(
      "AI endpoints require HTTPS. Trusted local endpoints need ALLOW_PRIVATE_AI=true.",
    );
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let dnsTimer: ReturnType<typeof setTimeout> | undefined;
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await Promise.race([
        lookup(hostname, { all: true }),
        new Promise<never>((_, reject) => {
          dnsTimer = setTimeout(
            () => reject(new Error("Endpoint DNS lookup timed out.")),
            5000,
          );
        }),
      ]).finally(() => clearTimeout(dnsTimer));
  if (
    !addresses.length ||
    (!local && addresses.some((a) => privateAddress(a.address)))
  )
    throw new Error("Private or reserved network endpoints are disabled.");
  return { url, address: addresses[0] };
}
type Configuration = {
  provider: string;
  model: string;
  endpoint: string;
  key?: string;
  consent: boolean;
  revision: number;
};
export async function callProvider(
  config: Configuration,
  messages: unknown[],
  checkConsent = true,
) {
  if (!config.key) throw new Error("Add an API key in Settings.");
  const { url, address } = await endpoint(config.endpoint);
  if (checkConsent) {
    const latest = await settings();
    if (!latest.consent || latest.revision !== config.revision)
      throw new Error("AI consent was revoked or the destination changed.");
  }
  const key = decrypt(config.key);
  const target = new URL(url.href.replace(/\/$/, "") + "/chat/completions");
  const body = JSON.stringify({
    model: config.model,
    messages,
    max_tokens: 1200,
    temperature: 0,
    response_format: { type: "json_object" },
  });
  return new Promise<unknown>((resolve, reject) => {
    const request = (target.protocol === "https:" ? https : http).request(
      target,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
          "Content-Length": Buffer.byteLength(body),
        },
        lookup: (_host, _options, callback) =>
          callback(null, address.address, address.family),
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 128000) {
            request.destroy();
            reject(new Error("Provider response exceeded the safety limit."));
          } else chunks.push(chunk);
        });
        response.on("end", () => {
          clearTimeout(timer);
          if (response.statusCode !== 200) {
            reject(
              new Error(
                response.statusCode === 401
                  ? "Provider rejected the API key. Replace it in Settings."
                  : response.statusCode === 429
                    ? "Provider rate limit reached. Try again later."
                    : "Provider request failed (" +
                      response.statusCode +
                      "). Check model and endpoint.",
              ),
            );
            return;
          }
          try {
            const envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            resolve(JSON.parse(envelope.choices[0].message.content));
          } catch {
            reject(new Error("Provider returned malformed structured output."));
          }
        });
      },
    );
    const timer = setTimeout(() => {
      reject(new Error("Provider timed out. Try ordinary search."));
      request.destroy();
    }, 20000);
    request.on("error", () => {
      clearTimeout(timer);
      reject(
        new Error(
          "Cannot connect to provider. Check endpoint, network, and model.",
        ),
      );
    });
    request.end(body);
  });
}
