import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["test/static-server/**"],
  },
  staged: {
    "src/**/*.js": "vp check --fix",
  },
  lint: {
    rules: {
      "prefer-promise-reject-errors": "off",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
