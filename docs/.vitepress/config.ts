import { defineConfig } from "vitepress";

const repo = "https://github.com/musaHaruna/js-bitcoinkernel";

export default defineConfig({
  title: "js-bitcoin-kernel",
  description: "TypeScript bindings for Bitcoin Core libbitcoinkernel.",
  lang: "en-US",
  base: process.env.VITEPRESS_BASE ?? "/",
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ["meta", { name: "theme-color", content: "#f7931a" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "js-bitcoin-kernel" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "A TypeScript wrapper around Bitcoin Core libbitcoinkernel for block, transaction, script, and chainstate validation.",
      },
    ],
  ],

  themeConfig: {
    logo: {
      light:
        "https://raw.githubusercontent.com/bitcoin-core/bitcoincore.org/master/assets/images/logo-light.svg",
      dark:
        "https://raw.githubusercontent.com/bitcoin-core/bitcoincore.org/master/assets/images/logo-dark.svg",
    },

    nav: [
      { text: "Guide", link: "/guide/introduction" },
      { text: "Tutorials", link: "/tutorials/validating-blocks" },
      { text: "API", link: "/api/overview" },
      { text: "GitHub", link: repo },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Repository Analysis", link: "/guide/repository-analysis" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Quick Start", link: "/guide/quick-start" },
            { text: "Architecture", link: "/guide/architecture" },
          ],
        },
      ],
      "/tutorials/": [
        {
          text: "Tutorials",
          items: [
            { text: "Validating Blocks", link: "/tutorials/validating-blocks" },
            { text: "Chainstate", link: "/tutorials/chainstate" },
            { text: "Transactions", link: "/tutorials/transactions" },
            { text: "Examples", link: "/tutorials/examples" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "Overview", link: "/api/overview" },
            { text: "Blocks", link: "/api/block" },
            { text: "Chainstate", link: "/api/chain" },
            { text: "Context", link: "/api/context" },
            { text: "Logging", link: "/api/log" },
            { text: "Scripts", link: "/api/script" },
            { text: "Transactions", link: "/api/transaction" },
            { text: "Validation Callbacks", link: "/api/validation" },
            { text: "Notifications", link: "/api/notifications" },
            { text: "Bootstrap Helpers", link: "/api/init" },
            { text: "Errors", link: "/api/errors" },
          ],
        },
      ],
      "/": [
        {
          text: "Start Here",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Repository Analysis", link: "/guide/repository-analysis" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Quick Start", link: "/guide/quick-start" },
            { text: "API Overview", link: "/api/overview" },
          ],
        },
      ],
    },

    search: {
      provider: "local",
    },

    socialLinks: [{ icon: "github", link: repo }],

    editLink: {
      pattern: `${repo}/edit/main/docs/:path`,
      text: "Edit this page on GitHub",
    },

    footer: {
      message:
        "Experimental software. Do not use for consensus-critical systems or funds handling.",
      copyright: "Released under the repository license.",
    },
  },
});
