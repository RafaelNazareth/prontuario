// Configuração mínima do ESLint (flat config) para o PEP.
// Objetivo: pegar erros reais (variáveis não definidas, imports quebrados)
// sem impor um estilo de código rígido — o projeto não usa um framework de
// componentes nem build step, então regras pensadas para React/TS não se
// aplicam aqui. Ver docs/FUTURE_IMPROVEMENTS.md para evolução futura.
export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["assets/js/**/*.js", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        crypto: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        CustomEvent: "readonly",
        TextEncoder: "readonly",
        Blob: "readonly",
        confirm: "readonly",
        location: "readonly",
        Chart: "readonly", // carregado via CDN em index.html
        globalThis: "readonly",
        btoa: "readonly",
        atob: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-undef": "error",
      "no-console": "off",
      eqeqeq: ["warn", "smart"],
    },
  },
  {
    // Servidor local e scripts de dados (Node.js)
    files: ["server/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-undef": "error",
    },
  },
];
