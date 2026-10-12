'use strict';

/**
 * Minimal gate harness.
 *
 * A gate is a plain Node script: it requires this, records checks, then calls
 * report(). The process exits non-zero when anything failed. report() also prints
 * a machine-readable `#RESULT#` line so tests/run.cjs can aggregate the gates
 * while each one stays independently runnable.
 */
function createHarness(gate) {
  let pass = 0;
  const failures = [];

  function check(label, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) {
      pass++;
      return true;
    }
    failures.push(`${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
    return false;
  }

  /**
   * @param {string[]} skips layers this gate could not run. Reported, never silent:
   *   a gate that quietly drops a layer reads as a green gate.
   */
  function report(skips = []) {
    const failed = failures.length > 0;
    console.log(
      `${failed ? 'FAIL' : 'PASS'} [${gate}] ${pass} assertion(s) passed` +
        (failed ? `, ${failures.length} failed` : '')
    );
    for (const f of failures) console.log(`  x ${f}`);
    for (const s of skips) console.log(`  ! SKIPPED (not verified): ${s}`);
    console.log(`#RESULT# ${JSON.stringify({ gate, pass, failed: failures.length, skips })}`);
    process.exitCode = failed ? 1 : 0;
  }

  return { check, report };
}

/** Abort a gate on an unexpected condition (missing input, compile failure, …). */
function fatal(gate, err) {
  console.log(`FAIL [${gate}] aborted: ${err && err.stack ? err.stack : err}`);
  console.log(`#RESULT# ${JSON.stringify({ gate, pass: 0, failed: 1, skips: [] })}`);
  process.exitCode = 1;
}

module.exports = { createHarness, fatal };
