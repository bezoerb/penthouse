import { spawn } from "child_process";

function grepProcessByPattern(pattern) {
  return new Promise((resolve) => {
    const ps = spawn("ps", ["aux"]);
    const grep = spawn("egrep", ["-i", pattern]);
    ps.stdout.on("data", (data) => {
      return grep.stdin.write(data);
    });
    ps.on("close", () => grep.stdin.end());
    let matchingProcesses = false;
    grep.stdout.on("data", (data) => {
      const result = data.toString();
      if (result.length) {
        matchingProcesses = result.split("\n").filter((i) => !!i);
      }
    });
    grep.on("close", () => {
      resolve(matchingProcesses);
    });
  });
}

function extractPIDs(processLines) {
  if (!processLines || !Array.isArray(processLines)) {
    return [];
  }
  // Extract PIDs from ps aux output (second column)
  return processLines
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      return parts[1]; // PID is the second column
    })
    .filter(Boolean);
}

export default function chromeProcessesRunning() {
  return Promise.all([
    // bit fragile to match across platforms..
    // also fragile relying on ~internal chrome headless process arguments to
    // distinguish between browser and page instances
    grepProcessByPattern("/[c]hrom(e|ium).*--disable-background"),
    grepProcessByPattern("/[c]hrom(e|ium).*--type=renderer"),
  ]).then(([browsers, pages]) => {
    return {
      browsers,
      pages,
      browserPIDs: extractPIDs(browsers),
      pagePIDs: extractPIDs(pages),
    };
  });
}
