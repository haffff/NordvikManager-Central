// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Nordvik Manager Docs',
  tagline: 'Documentation for Nordvik Manager',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://nordvikmanager.pl',
  // Served at the domain root; each doc section below owns its own routeBasePath
  // (/quickstart, /user-guide, /documentation, /addon-guide). There is no
  // Docusaurus homepage at "/" — that path is served by the Central server's
  // own landing page (static/landing/index.html).
  baseUrl: '/',

  organizationName: 'haffff',
  projectName: 'NordvikManager',

  // 'warn' rather than 'throw': the docs theme's breadcrumb "home" icon and the
  // 404 page both link to "/" unconditionally, which is real (Central's own
  // landing page) but doesn't exist inside this build — not an actual broken
  // link. Genuine broken links in our own content still show up as warnings.
  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // The classic preset's built-in single docs/blog instance is disabled —
  // each of the four sections below is its own named plugin-content-docs
  // instance instead, so they can live at independent routeBasePaths while
  // still sharing one theme/build.
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      /** @type {import('@docusaurus/plugin-content-docs').Options} */
      ({
        id: 'quickstart',
        path: 'quickstart',
        routeBasePath: 'quickstart',
        sidebarPath: './sidebars/quickstart.js',
      }),
    ],
    [
      '@docusaurus/plugin-content-docs',
      /** @type {import('@docusaurus/plugin-content-docs').Options} */
      ({
        id: 'user-guide',
        path: 'user-guide',
        routeBasePath: 'user-guide',
        sidebarPath: './sidebars/user-guide.js',
      }),
    ],
    [
      '@docusaurus/plugin-content-docs',
      /** @type {import('@docusaurus/plugin-content-docs').Options} */
      ({
        id: 'documentation',
        path: 'documentation',
        routeBasePath: 'documentation',
        sidebarPath: './sidebars/documentation.js',
      }),
    ],
    [
      '@docusaurus/plugin-content-docs',
      /** @type {import('@docusaurus/plugin-content-docs').Options} */
      ({
        id: 'addon-guide',
        path: 'addon-guide',
        routeBasePath: 'addon-guide',
        sidebarPath: './sidebars/addon-guide.js',
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Nordvik Manager Docs',
        items: [
          {
            type: 'docSidebar',
            docsPluginId: 'quickstart',
            sidebarId: 'quickstartSidebar',
            position: 'left',
            label: 'Quickstart',
          },
          {
            type: 'docSidebar',
            docsPluginId: 'user-guide',
            sidebarId: 'userGuideSidebar',
            position: 'left',
            label: 'User Guide',
          },
          {
            type: 'docSidebar',
            docsPluginId: 'documentation',
            sidebarId: 'documentationSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            type: 'docSidebar',
            docsPluginId: 'addon-guide',
            sidebarId: 'addonGuideSidebar',
            position: 'left',
            label: 'Addon Guide',
          },
          {href: 'https://nordvikmanager.pl', label: 'Main site', position: 'right'},
          {
            href: 'https://github.com/haffff/NordvikManager',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'Quickstart', to: '/quickstart'},
              {label: 'User Guide', to: '/user-guide'},
              {label: 'Documentation', to: '/documentation'},
              {label: 'Addon Guide', to: '/addon-guide'},
            ],
          },
          {
            title: 'More',
            items: [
              {label: 'Main site', href: 'https://nordvikmanager.pl'},
              {label: 'GitHub', href: 'https://github.com/haffff/NordvikManager'},
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Nordvik Manager.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
