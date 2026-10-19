import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import type { LookupAddress } from "node:dns";

/** Connect to a validated DNS answer while retaining the original Host and TLS name. */
export function requestPublicUrl(url: URL, addresses: LookupAddress[], accept: string, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      agent: false,
      signal,
      lookup: (_hostname, options, callback) => {
        const matching = addresses.filter(({ family }) => !options.family || family === options.family);
        const answers = matching.length ? matching : addresses;
        if (options.all) callback(null, answers);
        else callback(null, answers[0].address, answers[0].family);
      },
      headers: { Accept: accept, "Accept-Encoding": "identity", "User-Agent": "LittleApple-SiteIcon/1.0" },
    }, (incoming) => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (value !== undefined && key !== "set-cookie") headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
      const status = incoming.statusCode ?? 502;
      const body = [204, 205, 304].includes(status) ? null : Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
      if (!body) incoming.resume();
      resolve(new Response(body, { status, headers }));
    });
    request.on("error", reject);
    request.end();
  });
}
