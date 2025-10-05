import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import puppeteer from "puppeteer";
import { readFileSync as read } from "fs";
import path from "path";
import penthouse from "../../src/index.js";

import chromeProcessesRunning from "../util/chromeProcessesRunning.js";
import normaliseCss from "../util/normaliseCss.js";

function staticServerFileUrl(file) {
  return "file://" + path.join(process.env.PWD, "test", "static-server", file);
}

describe("extra tests for penthouse node module", () => {
  var page1FileUrl = staticServerFileUrl("page1.html");
  var page1cssPath = path.join(
    process.env.PWD,
    "test",
    "static-server",
    "page1.css"
  );

  // Give tests time to settle between runs to avoid browser state conflicts
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  // the last two tests are using the unstableKeepBrowserAlive property,
  // which expects to continue to use the same browser forever.
  // Hence we cannot close that browser until _both_ those tests are finished,
  // so it needs to be shared.
  // However before that test we have another test that checks that _all_
  // browsers have been closed (when _nt_ using unstableKeepBrowserAlive),
  // so we cannot start this extra shared browser until _after_ that.
  // So it is launched later in this file.
  let browserPromiseForUnstableKeepOpenTests;

  // module handles both callback (legacy), and promise
  it("module invocation should return promise", () => {
    var originalCss = read(page1cssPath).toString();

    return penthouse({
      url: page1FileUrl,
      css: page1cssPath,
    }).then((result) => {
      expect(result).toEqual(normaliseCss(originalCss));
    });
  });

  it("error should not contain debug info", () => {
    // callback
    return penthouse({
      url: "http://localhost.does.not.exist",
      css: page1cssPath,
    }).then(() => {
      throw new Error("did not return expected error")
    }).catch((err) => {
      if (err && /^Error: time: 0/.test(err)) {
        throw err;
      }
      // Otherwise test passes
    });
  });

  it("should use the browser given in options", async () => {
    let browserUsed = false;

    const browser = await puppeteer.launch();

    // Spy on browser.pages method as a means to see if this browser instance
    // is used
    let originalPagesMethod = browser.pages;
    browser.pages = (...args) => {
      browserUsed = true;
      return originalPagesMethod.call(browser, args);
    };
    return penthouse({
      url: page1FileUrl,
      css: page1cssPath,
      puppeteer: {
        getBrowser: () => browser,
      },
    }).then(() => {
      if (!browserUsed) {
        throw new Error("Did not use the browser passed in options");
      }
    });
  });

  it("should handle parallell jobs, sharing one browser instance, closing afterwards", async () => {
    // Track existing Chrome processes before test (e.g., Electron apps, other browsers)
    const beforeTest = await chromeProcessesRunning();
    const existingBrowserPIDs = new Set(beforeTest.browserPIDs || []);
    const existingPagePIDs = new Set(beforeTest.pagePIDs || []);
    
    const urls = [page1FileUrl, page1FileUrl, page1FileUrl];
    const promises = urls.map((url) => {
      return penthouse({ url, css: page1cssPath });
    });
    const results = await Promise.all(promises);
    const hasErrors = results.find((result) => {
      return result.error || !result.length;
    });
    if (hasErrors) {
      throw new Error("some result had errors: " + hasErrors);
    }
    
    // Give Chrome some time to shut down
    // NOTE: Browser cleanup is async, so we need to wait for processes to terminate
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    // Check for NEW processes that weren't there before
    const afterTest = await chromeProcessesRunning();
    const newBrowserPIDs = (afterTest.browserPIDs || []).filter(pid => !existingBrowserPIDs.has(pid));
    const newPagePIDs = (afterTest.pagePIDs || []).filter(pid => !existingPagePIDs.has(pid));
    
    if (newBrowserPIDs.length > 0 || newPagePIDs.length > 0) {
      throw new Error(`Chromium processes created by this test did not shut down properly:
        new browser PIDs: ${newBrowserPIDs.join(', ')}
        new page PIDs: ${newPagePIDs.join(', ')}`);
    }
  });

  it("should keep chromium browser instance open, if requested", async () => {
    browserPromiseForUnstableKeepOpenTests = puppeteer.launch();
    try {
      await penthouse({
        url: page1FileUrl,
        css: page1cssPath,
        unstableKeepBrowserAlive: true,
        // so we can kill the browser after
        puppeteer: { getBrowser: () => browserPromiseForUnstableKeepOpenTests },
      });
      // wait a bit to ensure Chrome doesn't just take time to close
      // we want to ensure it stays open
      // NOTE: With fork isolation, we need less time here since we're checking if browser stays open
      await new Promise((resolve) => setTimeout(resolve, 500));
      const { browsers } = await chromeProcessesRunning();
      // so test finishes automatically
      const browser = await browserPromiseForUnstableKeepOpenTests;
      await browser.close();

      if (!browsers) {
        throw new Error(
          "Chromium did NOT keep running despite option telling it so"
        );
      }
    } catch (err) {
      const browser = await browserPromiseForUnstableKeepOpenTests;
      await browser.close();
      throw err;
    }
  });
});
