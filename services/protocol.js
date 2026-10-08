'use strict';

/**
 * Protocol version of the GM backend ↔ player client connection.
 * A plain integer that only goes up on breaking changes. Player clients for older
 * protocols are kept as frozen builds under /client/p{N}/.
 *
 * The value comes from the GM backend and ends up in a URL on the player side,
 * so anything that is not a positive integer is treated as missing.
 */
function parseProtocol(value) {
  return Number.isInteger(value) && value >= 1 ? value : null;
}

/**
 * Decides whether a GM backend speaking `rawProtocol` may register with this Central.
 * @returns {{ ok: true, protocol: number } | { ok: false, error: string }}
 */
function checkGmProtocol(rawProtocol, minProtocol) {
  const protocol = parseProtocol(rawProtocol);
  if (protocol !== null && protocol >= minProtocol) {
    return { ok: true, protocol };
  }
  const current = protocol === null ? 'unknown' : `protocol ${protocol}`;
  return {
    ok: false,
    error: `Your NordvikManager server is outdated (${current}, minimum ${minProtocol}). Please update it to start a session.`,
  };
}

module.exports = { parseProtocol, checkGmProtocol };
