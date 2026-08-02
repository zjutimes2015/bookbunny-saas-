/**
 * Standalone test for the SSRF guard in `src/actions/upload-image-from-url.ts`.
 *
 * Run with:
 *   pnpm tsx scripts/test-ssrf-guard.ts
 *   # or, when tsx isn't installed:
 *   node --experimental-strip-types --experimental-transform-types scripts/test-ssrf-guard.ts
 *
 * The test loads the source file at runtime so we don't need a unit test
 * framework just for one module. It exercises the exported
 * `validateExternalImageUrl` function against well-known SSRF payloads,
 * including the IPv6 / IPv4-mapped-IPv6 bypasses that the previous
 * string-only check missed (because the URL parser keeps the brackets).
 */

import { validateExternalImageUrl } from '../src/actions/upload-image-from-url';

interface Case {
  url: string;
  shouldAccept: boolean;
  description: string;
}

const cases: Case[] = [
  // Public URLs should pass.
  { url: 'https://cdn.example.com/logo.png', shouldAccept: true, description: 'public https URL' },
  { url: 'http://example.com/image.jpg', shouldAccept: true, description: 'public http URL' },
  { url: 'https://images.unsplash.com/photo-123', shouldAccept: true, description: 'public CDN' },
  { url: 'http://8.8.8.8/img.png', shouldAccept: true, description: 'public IPv4' },
  { url: 'https://[2606:4700:4700::1111]/img.png', shouldAccept: true, description: 'public IPv6 (Cloudflare DNS)' },

  // Loopback.
  { url: 'http://127.0.0.1/admin', shouldAccept: false, description: 'loopback IPv4' },
  { url: 'http://127.255.255.254/x', shouldAccept: false, description: 'loopback range edge' },
  { url: 'http://[::1]/x', shouldAccept: false, description: 'IPv6 loopback' },
  { url: 'http://[::]/x', shouldAccept: false, description: 'IPv6 unspecified' },
  { url: 'http://[0:0:0:0:0:0:0:1]/x', shouldAccept: false, description: 'IPv6 loopback full form' },

  // Private networks.
  { url: 'http://10.0.0.1/', shouldAccept: false, description: '10.0.0.0/8 private' },
  { url: 'http://10.255.255.255/', shouldAccept: false, description: '10.0.0.0/8 edge' },
  { url: 'http://172.16.0.1/', shouldAccept: false, description: '172.16.0.0/12 private' },
  { url: 'http://172.31.255.255/', shouldAccept: false, description: '172.16.0.0/12 edge' },
  { url: 'http://172.32.0.1/', shouldAccept: true, description: 'just above 172.16.0.0/12 (public)' },
  { url: 'http://172.15.0.1/', shouldAccept: true, description: 'just below 172.16.0.0/12 (public)' },
  { url: 'http://192.168.1.1/', shouldAccept: false, description: '192.168.0.0/16 private' },

  // Link-local / cloud metadata.
  { url: 'http://169.254.169.254/latest/meta-data/', shouldAccept: false, description: 'AWS metadata' },
  { url: 'http://169.254.0.1/', shouldAccept: false, description: 'link-local edge' },

  // Other reserved ranges.
  { url: 'http://0.0.0.0/', shouldAccept: false, description: '0.0.0.0/8' },
  { url: 'http://100.64.0.1/', shouldAccept: false, description: 'CGNAT' },
  { url: 'http://224.0.0.1/', shouldAccept: false, description: 'multicast' },
  { url: 'http://255.255.255.255/', shouldAccept: false, description: 'broadcast' },

  // Localhost by name.
  { url: 'http://localhost/admin', shouldAccept: false, description: 'localhost by name' },
  { url: 'http://api.localhost/', shouldAccept: false, description: '.localhost subdomain' },
  { url: 'http://printer.local/', shouldAccept: false, description: '.local' },
  { url: 'http://server.internal/', shouldAccept: false, description: '.internal' },

  // IPv6 private/ULA.
  { url: 'http://[fc00::1]/', shouldAccept: false, description: 'IPv6 ULA' },
  { url: 'http://[fd12:3456::1]/', shouldAccept: false, description: 'IPv6 ULA' },
  { url: 'http://[fe80::1]/', shouldAccept: false, description: 'IPv6 link-local' },
  { url: 'http://[fe90::1]/', shouldAccept: false, description: 'IPv6 link-local fe90' },
  { url: 'http://[febf::1]/', shouldAccept: false, description: 'IPv6 link-local febf edge' },
  { url: 'http://[ff02::1]/', shouldAccept: false, description: 'IPv6 multicast' },

  // IPv4-mapped IPv6 in any form. The URL parser normalises the dotted
  // form to hex, so `::ffff:127.0.0.1` arrives as `::ffff:7f00:1`. Each
  // of these should be rejected because they all resolve to loopback or
  // 0.0.0.0 on a system with IPv4-mapped IPv6 support.
  { url: 'http://[::ffff:127.0.0.1]/', shouldAccept: false, description: 'IPv4-mapped loopback (dotted)' },
  { url: 'http://[::ffff:7f00:1]/', shouldAccept: false, description: 'IPv4-mapped loopback (hex)' },
  { url: 'http://[::ffff:0:0]/', shouldAccept: false, description: 'IPv4-mapped 0.0.0.0' },
  { url: 'http://[::ffff:0.0.0.0]/', shouldAccept: false, description: 'IPv4-mapped 0.0.0.0 (dotted)' },
  { url: 'http://[::ffff:10.0.0.1]/', shouldAccept: false, description: 'IPv4-mapped private 10.0.0.1' },
  { url: 'http://[::ffff:169.254.169.254]/', shouldAccept: false, description: 'IPv4-mapped cloud metadata' },
  { url: 'http://[::ffff:c0a8:101]/', shouldAccept: false, description: 'IPv4-mapped 192.168.1.1 (hex)' },
  { url: 'http://[0:0:0:0:0:ffff:127.0.0.1]/', shouldAccept: false, description: 'IPv4-mapped alt form' },

  // URL parsing tricks.
  { url: 'https://google.com@127.0.0.1/', shouldAccept: false, description: 'userinfo trick' },
  { url: 'https://127.0.0.1#@google.com/', shouldAccept: false, description: 'hash trick' },
  { url: 'ftp://example.com/', shouldAccept: false, description: 'non-http(s) scheme' },
  { url: 'file:///etc/passwd', shouldAccept: false, description: 'file:// scheme' },
  { url: 'javascript:alert(1)', shouldAccept: false, description: 'javascript: scheme' },
  { url: 'not-a-url', shouldAccept: false, description: 'unparseable' },
];

let failures = 0;
for (const c of cases) {
  const result = validateExternalImageUrl(c.url);
  const accepted = result.ok;
  const passed = accepted === c.shouldAccept;
  const status = passed ? 'PASS' : 'FAIL';
  const reason = accepted ? '' : ` (${result.reason})`;
  console.log(`[${status}] ${c.description}: ${c.url} -> ${accepted ? 'accepted' : 'rejected'}${reason}`);
  if (!passed) failures++;
}

if (failures > 0) {
  console.error(`\n${failures} test case(s) failed`);
  process.exit(1);
} else {
  console.log(`\nAll ${cases.length} test cases passed.`);
}
