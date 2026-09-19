"use strict";
function readRecoveryTargets(env) {
  if (env.LEDGERBYTE_DR_SOURCE_QUIESCED !== "true" || env.LEDGERBYTE_DR_SYNTHETIC_SCOPE !== "true") throw new Error("Quiesced synthetic proof scope is required.");
  function read(name, hostName) {
    try {
      const url = new URL(env[name]);
      if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== env[hostName] || url.searchParams.get("sslmode") !== "require" || !url.pathname || url.pathname === "/") throw new Error();
      return { value: env[name], identity: `${url.hostname}:${url.port || "5432"}${url.pathname}` };
    } catch { throw new Error("Recovery target does not match the exact reviewed host, database, or TLS policy."); }
  }
  const source = read("LEDGERBYTE_DR_SOURCE_DATABASE_URL", "LEDGERBYTE_DR_SOURCE_HOST");
  const target = read("LEDGERBYTE_DR_RESTORE_DATABASE_URL", "LEDGERBYTE_DR_RESTORE_HOST");
  if (source.identity === target.identity) throw new Error("Source and restore targets must differ.");
  return { source: source.value, target: target.value };
}
module.exports = { readRecoveryTargets };
