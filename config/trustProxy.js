'use strict';

// Express 'trust proxy' from TRUST_PROXY. On the hosting, LiteSpeed sits in front of Node and
// adds X-Forwarded-For; without trusting it every request comes from the proxy's address, so
// the login/register rate limits would count all users as one. Production defaults to one
// hop (a hop count works over a unix socket too, where there is no peer address); elsewhere
// nothing is trusted, so a client can't fake its address with the header.
// Values: a hop count ("1"), "true"/"false", or addresses/subnets ("loopback, 10.0.0.1").
function parseTrustProxy(value, isProduction) {
  const raw = (value || '').trim();
  if (!raw) return isProduction ? 1 : false;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  return raw;
}

module.exports = { parseTrustProxy };
