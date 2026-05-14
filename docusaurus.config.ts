import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'HCAIRE — Documentazione tecnica',
  tagline: 'Documentazione del monorepo hcaire (hcaire.ai)',
  favicon: 'img/favicon.ico',

  url: 'https://stfnbssl.github.io',
  baseUrl: '/hcaire-docs/',

  organizationName: 'stfnbssl',
  projectName: 'hcaire-docs',
  trailingSlash: false,
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'it',
    locales: ['it'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
    [
      'redocusaurus',
      {
        specs: [
          {
            id: 'rest-api',
            spec: 'static/openapi.yaml',
            route: '/api-reference/',
          },
        ],
        theme: {
          primaryColor: '#0284c7',
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'HCAIRE Docs',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentazione',
        },
        {
          to: '/api-reference/',
          label: 'API reference',
          position: 'left',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `© ${new Date().getFullYear()} HCAIRE — Documentazione tecnica.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'tsx'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
