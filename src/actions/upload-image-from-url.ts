'use server';

import { websiteConfig } from '@/config/website';
import { uploadFile } from '@/storage';
import { storageConfig } from '@/storage/config/storage-config';

// Timeout for image download (30 seconds)
const IMAGE_DOWNLOAD_TIMEOUT = 30000;

/**
 * Check if URL is already in our storage
 */
function isStorageUrl(url: string): boolean {
  const { publicUrl, endpoint } = storageConfig;
  return (
    (publicUrl && url.startsWith(publicUrl)) ||
    (endpoint !== undefined && endpoint !== null && url.includes(endpoint))
  );
}

/**
 * Returns true if the IP address belongs to a private/reserved range that
 * must never be reachable from server-side image fetches (loopback,
 * private LAN, link-local incl. cloud metadata, multicast, IPv6 ULA, etc.).
 *
 * IMPORTANT: the caller must pass the bare hostname, i.e. without the
 * surrounding `[...]` that the URL parser preserves on IPv6 literals.
 */
function isPrivateOrReservedIp(rawHostname: string): boolean {
  // Strip the brackets the URL parser keeps on IPv6 literals.
  const hostname = rawHostname.startsWith('[') && rawHostname.endsWith(']')
    ? rawHostname.slice(1, -1)
    : rawHostname;

  // IPv4
  const ipv4Match = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  );
  if (ipv4Match) {
    const a = Number(ipv4Match[1]);
    const b = Number(ipv4Match[2]);
    const c = Number(ipv4Match[3]);
    const d = Number(ipv4Match[4]);
    if (![a, b, c, d].every((o) => o >= 0 && o <= 255)) {
      // Reject malformed octets defensively.
      return true;
    }
    // 127.0.0.0/8 loopback
    if (a === 127) return true;
    // 10.0.0.0/8 private
    if (a === 10) return true;
    // 172.16.0.0/12 private
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 private
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 link-local (covers AWS/GCP/Azure metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
    // 100.64.0.0/10 carrier-grade NAT
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 192.0.0.0/24, 192.0.2.0/24, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24
    if (a === 192 && b === 0) return true;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
    if (a === 203 && b === 0) return true;
    // 224.0.0.0/4 multicast, 240.0.0.0/4 reserved
    if (a >= 224) return true;
    return false;
  }

  // IPv6: parse to 8 16-bit groups, then apply well-known-prefix checks.
  // We do this in parsed form (not string) so we can robustly handle every
  // surface form Node's URL parser may produce, including
  // `::ffff:7f00:1` (hex IPv4-mapped) and `::ffff:0:0` (mapped 0.0.0.0),
  // which a literal string check would miss.
  const ipv6 = parseIPv6ToGroups(hostname);
  if (ipv6) {
    return isPrivateOrReservedIpv6(ipv6);
  }
  return false;
}

/**
 * Parse an IPv6 address (with possible embedded IPv4 in the last 32 bits,
 * in dotted-decimal or hex form) into 8 16-bit groups. Returns null if
 * the input is not a valid IPv6 literal.
 */
function parseIPv6ToGroups(hostname: string): number[] | null {
  const lower = hostname.toLowerCase();
  // Reject anything that isn't purely IPv6 characters. This also keeps
  // hostnames that happen to start with `[` out.
  if (!/^[0-9a-f:.]+$/.test(lower)) return null;

  // Split off a possible trailing IPv4-in-dotted-decimal form, e.g.
  // `::ffff:127.0.0.1`. Node's URL parser already normalises the dotted
  // form to its hex equivalent (`::ffff:7f00:1`) so we may not encounter
  // it here, but be defensive.
  let head = lower;
  let ipv4Bytes: number[] | null = null;
  const lastColon = lower.lastIndexOf(':');
  if (lastColon !== -1) {
    const tail = lower.slice(lastColon + 1);
    if (tail.includes('.')) {
      const parts = tail.split('.');
      if (parts.length !== 4) return null;
      const nums = parts.map((p) => Number(p));
      if (!nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
        return null;
      }
      ipv4Bytes = [(nums[0] << 8) | nums[1], (nums[2] << 8) | nums[3]];
      head = lower.slice(0, lastColon);
    }
  }

  // Split on `::` to handle the zero-compression.
  const dcIdx = head.indexOf('::');
  let left: string[] = [];
  let right: string[] = [];
  if (dcIdx === -1) {
    left = head.split(':');
  } else {
    left = head.slice(0, dcIdx).split(':').filter((g) => g.length > 0);
    right = head.slice(dcIdx + 2).split(':').filter((g) => g.length > 0);
    // A `::` may also be present at the start or end with one side empty.
  }

  const parseGroup = (g: string): number | null => {
    if (g.length === 0 || g.length > 4) return null;
    if (!/^[0-9a-f]+$/.test(g)) return null;
    const n = parseInt(g, 16);
    return Number.isFinite(n) && n >= 0 && n <= 0xffff ? n : null;
  };

  const leftNums: number[] = [];
  for (const g of left) {
    const n = parseGroup(g);
    if (n === null) return null;
    leftNums.push(n);
  }
  const rightNums: number[] = [];
  for (const g of right) {
    const n = parseGroup(g);
    if (n === null) return null;
    rightNums.push(n);
  }

  const embedded = ipv4Bytes ? 2 : 0;
  const total = leftNums.length + rightNums.length + embedded;
  // Without `::` we must have exactly 8 groups (or 6 + 2 embedded).
  // With `::` we must have fewer than 8.
  if (dcIdx === -1) {
    if (total !== 8) return null;
  } else {
    if (total >= 8) return null;
  }

  const zeros = 8 - leftNums.length - rightNums.length - embedded;
  const groups = [...leftNums, ...Array(zeros).fill(0), ...rightNums];
  if (ipv4Bytes) groups.push(...ipv4Bytes);
  if (groups.length !== 8) return null;
  return groups;
}

/**
 * Decide whether an IPv6 address represented as 8 16-bit groups belongs
 * to a private/reserved range we must never reach. Each branch matches
 * a documented IANA assignment.
 */
function isPrivateOrReservedIpv6(g: number[]): boolean {
  const [a, b, c, d, e, f, h, i] = g;

  // :: unspecified
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 && h === 0 && i === 0) {
    return true;
  }
  // ::1 loopback
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 && h === 0 && i === 1) {
    return true;
  }
  // fe80::/10 link-local (covers fe80..febf)
  if (a >= 0xfe80 && a <= 0xfebf) return true;
  // fc00::/7 unique local (fc00..fdff)
  if ((a & 0xfe00) === 0xfc00) return true;
  // ff00::/8 multicast
  if ((a & 0xff00) === 0xff00) return true;

  // ::ffff:0:0/96 IPv4-mapped: extract the embedded IPv4 and re-check.
  // This catches ::ffff:7f00:1 (== 127.0.0.1) and ::ffff:0:0 (== 0.0.0.0).
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0xffff) {
    const oct1 = (h >> 8) & 0xff;
    const oct2 = h & 0xff;
    const oct3 = (i >> 8) & 0xff;
    const oct4 = i & 0xff;
    return isPrivateOrReservedIp(`${oct1}.${oct2}.${oct3}.${oct4}`);
  }

  // ::a.b.c.d IPv4-compatible (deprecated RFC 4291). Groups 0-5 are all
  // zero (the `::` and `::1` cases were already handled above), so any
  // non-zero bits in groups 6-7 are an embedded IPv4. Catches
  // `::127.0.0.1` (normalised by the URL parser to `::7f00:1`).
  if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0) {
    const oct1 = (h >> 8) & 0xff;
    const oct2 = h & 0xff;
    const oct3 = (i >> 8) & 0xff;
    const oct4 = i & 0xff;
    return isPrivateOrReservedIp(`${oct1}.${oct2}.${oct3}.${oct4}`);
  }

  // 2002::/16 6to4: anycast prefix of 2002::/16, otherwise the next
  // 32 bits are an embedded IPv4. Conservatively treat the embedded
  // IPv4 as if it were the destination.
  if (a === 0x2002) {
    const oct1 = (b >> 8) & 0xff;
    const oct2 = b & 0xff;
    const oct3 = (c >> 8) & 0xff;
    const oct4 = c & 0xff;
    return isPrivateOrReservedIp(`${oct1}.${oct2}.${oct3}.${oct4}`);
  }

  // 64:ff9b::/96 NAT64 well-known prefix (RFC 6052): the IPv4 lives in
  // the last 32 bits, i.e. groups 6-7. We must accept the IPv4 there
  // in both dotted and hex forms, so we only require groups 0-5 to
  // match the prefix.
  if (a === 0x0064 && b === 0xff9b && c === 0 && d === 0 && e === 0 && f === 0) {
    const oct1 = (h >> 8) & 0xff;
    const oct2 = h & 0xff;
    const oct3 = (i >> 8) & 0xff;
    const oct4 = i & 0xff;
    return isPrivateOrReservedIp(`${oct1}.${oct2}.${oct3}.${oct4}`);
  }

  return false;
}

/**
 * Hostnames that should never be fetched from the server even if a public
 * DNS resolver would return a public IP (e.g. attacker-controlled DNS).
 */
function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost') return true;
  if (lower.endsWith('.localhost')) return true;
  if (lower.endsWith('.local')) return true;
  if (lower.endsWith('.internal')) return true;
  if (lower.endsWith('.intranet')) return true;
  if (lower.endsWith('.corp')) return true;
  return false;
}

/**
 * Validate that a URL is safe to fetch from the server (i.e. it points to
 * an external, publicly-routable resource). Returns null if the URL is safe,
 * otherwise a human-readable reason.
 *
 * This guards against SSRF: a logged-in user submitting a product can
 * otherwise make the server request arbitrary internal addresses such as
 * 169.254.169.254 (cloud metadata), 127.0.0.1 (loopback) or
 * http://10.0.0.1/admin via the logo/ogImage fields.
 */
export function validateExternalImageUrl(
  rawUrl: string
): { ok: true } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs are allowed' };
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    return { ok: false, reason: 'Missing hostname' };
  }

  if (isBlockedHostname(hostname)) {
    return { ok: false, reason: 'Hostname not allowed' };
  }

  if (isPrivateOrReservedIp(hostname)) {
    return { ok: false, reason: 'Internal IP addresses are not allowed' };
  }

  return { ok: true };
}

/**
 * Extract file extension from URL or content type
 */
function getFileExtension(url: string, contentType: string): string {
  const urlPath = new URL(url).pathname;
  const urlFilename = urlPath.split('/').pop() || '';

  if (urlFilename.includes('.')) {
    return urlFilename.split('.').pop() || '';
  }

  return contentType.split('/')[1]?.split(';')[0] || 'png';
}

/**
 * Download an image from URL with timeout.
 *
 * `redirect: 'manual'` is critical for SSRF safety: an attacker-controlled
 * host could otherwise 30x-redirect to an internal address after we have
 * already validated the initial URL.
 */
async function downloadImageWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
      redirect: 'manual',
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image download timeout');
    }
    throw error;
  }
}

/**
 * Download an image from URL and upload it to storage
 * Returns the new storage URL if successful, or null on error
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  folder: string
): Promise<string | null> {
  if (!websiteConfig.storage.enable || !imageUrl) {
    return null;
  }

  // Skip if already in our storage
  if (isStorageUrl(imageUrl)) {
    return imageUrl;
  }

  // SSRF guard: reject any URL that targets an internal/private address.
  // Without this, an authenticated user can submit a product with
  // logo/ogImage pointing at 169.254.169.254 (cloud metadata),
  // 127.0.0.1, 10.0.0.0/8, etc., and cause the server to fetch it.
  const validation = validateExternalImageUrl(imageUrl);
  if (!validation.ok) {
    console.warn('uploadImageFromUrl, rejected unsafe URL:', imageUrl, validation.reason);
    return null;
  }

  try {
    // Download with timeout.
    // `redirect: 'manual'` prevents the server from following a redirect to
    // an internal address, which would otherwise bypass the URL check above.
    const response = await downloadImageWithTimeout(
      imageUrl,
      IMAGE_DOWNLOAD_TIMEOUT
    );

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error('URL does not point to an image');
    }

    // Convert to buffer and upload
    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = getFileExtension(imageUrl, contentType);
    const filename = `image.${extension}`;
    const result = await uploadFile(buffer, filename, contentType, folder);

    return result.url;
  } catch (error) {
    console.error('Upload image from URL error:', error);
    return null;
  }
}
