import { describe, it, expect } from "vite-plus/test";
import puppeteer from "puppeteer";
import path from "path";
import penthouse from "../../src/index.js";

function staticServerPerfHtmlUrl(file) {
  return "file://" + path.join(process.env.PWD, "test", "static-server", "perf", file);
}

const FIXTURES = [
  {
    // NOTE: with current test setup, the first test incurs extra cost of launching browser
    // whereas the latter ones re-use it
    threshold: 2200,
    name: "stripe",
  },
  {
    threshold: 2000,
    name: "jso",
  },
  // to much variation in page load time
  // {
  //   threshold: 2900,
  //   name: 'dn'
  // },
  {
    threshold: 4800,
    name: "guardian",
  },
  {
    threshold: 6400,
    name: "forbesindustries",
  },
];

describe("performance tests for penthouse", () => {
  // CI runners (esp. GitHub-hosted) have variable, generally slower CPU than
  // local dev machines. Use a multiplier so thresholds stay meaningful locally
  // without producing flaky failures in CI.
  const CI_THRESHOLD_MULTIPLIER = process.env.CI ? 1.5 : 1;

  const browserPromise = puppeteer.launch({
    args: ["--no-sandbox"],
  });

  let testsCompleted = 0;
  FIXTURES.forEach(({ name, threshold }) => {
    const adjustedThreshold = Math.round(threshold * CI_THRESHOLD_MULTIPLIER);
    // forbesindustries has malformed HTML (64KB single line), needs pageLoadSkipTimeout
    const timeout = name === "forbesindustries" ? 15000 : 10000;
    const penthouseOptions = {
      url: staticServerPerfHtmlUrl(`${name}.html`),
      css: path.join(process.env.PWD, "test", "static-server", "perf", `${name}.css`),
      unstableKeepBrowserAlive: true,
      puppeteer: { getBrowser: () => browserPromise },
    };

    // Only use pageLoadSkipTimeout for forbesindustries (slow-loading malformed HTML)
    if (name === "forbesindustries") {
      penthouseOptions.pageLoadSkipTimeout = 5000;
    }

    it(`Penthouse should handle ${name} in less than ${adjustedThreshold / 1000}s`, { timeout }, () => {
      const start = Date.now();
      return penthouse(penthouseOptions).then((result) => {
        testsCompleted++;
        if (testsCompleted === FIXTURES.length) {
          console.log("close shared browser after performance tests");
          browserPromise.then((browser) => browser.close());
        }
        expect(Date.now() - start).toBeLessThan(adjustedThreshold);
      });
    });
  });
});
