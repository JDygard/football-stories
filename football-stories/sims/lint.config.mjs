// The guard for the bug class that shipped a broken desktop era-focus.
//
// `staffRef` was referenced in DesktopApp.jsx and never declared. That is valid
// syntax — esbuild compiled it without complaint, every sim passed, and the
// feature silently did nothing the moment anyone clicked a plaque, because the
// ReferenceError aborted the handler before it selected anybody. Mobile worked
// only because its copy of the same twenty lines happened to be complete.
//
// no-undef is the only thing that finds this without a browser. The repo's own
// `npm run lint` should be the routine path; this config exists so the check
// can be run standalone in a sandbox where the full plugin set may not resolve:
//
//     npx eslint --config sims/lint.config.mjs "src/**/*.{js,jsx}" \
//       --rule '{"react-hooks/exhaustive-deps":"off"}'
//
// Run it after touching either shell. Two copies of one paragraph across
// App.jsx and DesktopApp.jsx is how the original bug happened; the resolvers in
// utils/eraCast.js exist to stop there being two copies, and this catches what
// is left.
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
    },
  },
];
