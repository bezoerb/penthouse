import { describe, it, expect } from "vite-plus/test";
import path from "path";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";
import penthouse from "../src/index.js";
import compareScreenshots from "./util/compareScreenshots.js";

// GraphicsMagick is a runtime dependency of `gm` (used by compareScreenshots).
// Skip these tests if it is not installed locally; CI installs it explicitly.
function hasGraphicsMagick() {
  try {
    execSync("gm version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const describeIfGM = hasGraphicsMagick() ? describe : describe.skip;

function staticServerFileUrl(file) {
  return "file://" + path.join(process.env.PWD, "test", "static-server", file);
}

describeIfGM("penthouse screenshot regression tests", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "penthouse-screenshots-"));

  it("should produce visually equivalent before/after screenshots for above-the-fold content", () => {
    const basePath = path.join(tmpDir, "page1");
    const cssFilePath = path.join(process.env.PWD, "test", "static-server", "page1.css");

    return penthouse({
      url: staticServerFileUrl("page1.html"),
      css: cssFilePath,
      width: 800,
      height: 450,
      screenshots: {
        basePath,
        type: "png",
      },
    }).then(() => {
      const beforePath = basePath + "-before.png";
      const afterPath = basePath + "-after.png";
      expect(fs.existsSync(beforePath)).toBe(true);
      expect(fs.existsSync(afterPath)).toBe(true);
      return compareScreenshots(beforePath, afterPath);
    });
  });
});
