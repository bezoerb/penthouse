import { describe, it, test, expect, beforeAll, afterAll } from "vite-plus/test";
import path from "path";
import penthouse from "../src/index.js";
import { readFileSync as read } from "fs";
import * as csstree from "css-tree";
import http from "http";
import url from "url";

import normaliseCss from "./util/normaliseCss.js";

const serverPort = 8888;
const allowedResponseCodeError = /Server response status/;

function staticServerFileUrl(file) {
  return "file://" + path.join(process.env.PWD, "test", "static-server", file);
}

function responseStatusUrl(code) {
  return "http://localhost:" + serverPort + "?responseStatus=" + code;
}

function testAllowedResponseCode(shouldMatch, responseCode, allowedResponseCode) {
  const errorMessage = shouldMatch
    ? "Did throw an error while allowedResponseCode was matching the response code"
    : "Didn't throw an error while allowedResponseCode wasn't matching the response code";

  return penthouse({
    url: responseStatusUrl(responseCode),
    allowedResponseCode: allowedResponseCode,
    cssString: "body {}",
  })
    .then(() => {
      if (!shouldMatch) {
        throw new Error(errorMessage);
      }
    })
    .catch((err) => {
      if (!shouldMatch && err.message.match(allowedResponseCodeError)) {
        return; // Test passes
      } else if (shouldMatch) {
        throw new Error(errorMessage);
      }
    });
}

describe("basic tests of penthouse functionality", () => {
  var page1FileUrl = staticServerFileUrl("page1.html");
  var page1cssPath = path.join(process.env.PWD, "test", "static-server", "page1.css");
  var originalCss = read(page1cssPath).toString();
  var httpServer;

  beforeAll(function () {
    httpServer = http
      .createServer(function (request, response) {
        var query = url.parse(request.url, true).query;
        response.writeHead(query.responseStatus);
        response.end();
      })
      .listen(serverPort);
  });

  afterAll(function () {
    httpServer.close();
  });

  function largeViewportTest() {
    var widthLargerThanTotalTestCSS = 1000;
    var heightLargerThanTotalTestCSS = 1000;

    return penthouse({
      url: page1FileUrl,
      css: page1cssPath,
      width: widthLargerThanTotalTestCSS,
      height: heightLargerThanTotalTestCSS,
    }).then((result) => {
      expect(result).toEqual(normaliseCss(originalCss));
    });
  }

  function smallViewportTest() {
    var widthLargerThanTotalTestCSS = 1000;
    var heightSmallerThanTotalTestCSS = 100;

    return penthouse({
      url: page1FileUrl,
      css: page1cssPath,
      width: widthLargerThanTotalTestCSS,
      height: heightSmallerThanTotalTestCSS,
    }).then((result) => {
      const resultRules = csstree.toPlainObject(csstree.parse(result)).children;
      const originalRules = csstree.toPlainObject(csstree.parse(originalCss)).children;
      expect(resultRules.length).toBeLessThan(originalRules.length);
      // not be empty
    });
  }

  it(
    "should return a css file whose parsed AST is equal to the the original's AST when the viewport is large",
    largeViewportTest,
  );

  it(
    "should return a subset of the original AST rules when the viewport is small",
    smallViewportTest,
  );

  // largeViewportTest will set the default viewport, in the puppeteer browser penthouse
  // will re-use for the smallViewportTest here (since they run in parallell).
  // Since this is not the viewport size the second test wants,
  // penthouse needs to explicitly update the viewport on the browser page during execution.
  // This test will fail if that doesn't happen.
  it("should handle updating viewport size between two jobs run at the same time", () => {
    return Promise.all([largeViewportTest(), smallViewportTest()]);
  });

  it("should not crash on invalid css", () => {
    return penthouse({
      url: page1FileUrl,
      css: path.join(process.env.PWD, "test", "static-server", "invalid.css"),
    }).then((result) => {
      if (result.length === 0) {
        throw new Error("length should be > 0");
      }
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it("should not crash on invalid media query", () => {
    return penthouse({
      url: page1FileUrl,
      css: path.join(process.env.PWD, "test", "static-server", "invalid-media.css"),
    }).then((result) => {
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it("should crash with errors in strict mode on invalid css", () => {
    return expect(
      penthouse({
        url: page1FileUrl,
        css: path.join(process.env.PWD, "test", "static-server", "invalid.css"),
        strict: true,
      }),
    ).rejects.toThrow();
  });

  it("should not crash or hang on special chars", () => {
    return penthouse({
      url: page1FileUrl,
      css: path.join(process.env.PWD, "test", "static-server", "special-chars.css"),
    }).then((result) => {
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it("should surface parsing errors to the end user", () => {
    return expect(
      penthouse({
        css: "missing.css",
      }),
    ).rejects.toThrow();
  });

  it("should exit after timeout", () => {
    return penthouse({
      url: page1FileUrl,
      css: page1cssPath,
      timeout: 100,
    })
      .then(() => {
        throw new Error("Got no timeout error");
      })
      .catch((err) => {
        if (err && /Penthouse timed out/.test(err)) {
          return; // Test passes
        } else {
          throw new Error("Did not get timeout error, got: " + err);
        }
      });
  });

  it("should not throw an error on a 401 without allowedResponseCode option", () => {
    return penthouse({
      url: responseStatusUrl(401),
      css: page1cssPath,
    }).catch((err) => {
      if (err && err.message.match(allowedResponseCodeError)) {
        throw new Error("Error thrown on a 401 without allowedResponseCode option");
      }
      // Otherwise the test passes (error was something else)
    });
  });

  // allowedResponseCode not matching
  it("should throw an error on non matching allowedResponseCode (number) option", () => {
    return testAllowedResponseCode(false, 401, 200);
  });

  it("should throw an error on non matching allowedResponseCode (regex) option", () => {
    return testAllowedResponseCode(false, 401, /2\d+/);
  });

  it("should throw an error on non matching allowedResponseCode (function) option", () => {
    const responseCode = 401;
    function nonMatchFunction(response) {
      return response.status() === responseCode + 1;
    }

    return testAllowedResponseCode(false, 401, nonMatchFunction);
  });

  // matching allowedResponseCode
  it("shouldn't throw an error on matching allowedResponseCode (number) option", () => {
    return testAllowedResponseCode(true, 401, 401);
  });

  it("shouldn't throw an error on matching allowedResponseCode (regex) option", () => {
    return testAllowedResponseCode(true, 401, /4\d+/);
  });

  it("shouldn't throw an error on matching allowedResponseCode (function) option", () => {
    const responseCode = 401;
    function matchFunction(response) {
      return response.status() === responseCode;
    }

    return testAllowedResponseCode(true, 401, matchFunction);
  });
});
