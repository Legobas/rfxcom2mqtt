const { description, name } = require('./package')
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";
import { navbar } from "./navbar";
import { sidebar } from "./sidebar";

const conf = defineUserConfig({
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'Rfxcom2Mqtt Documentation',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: description,
  dest: 'dist',
  public: 'public',
  temp: '.temp',
  cache: '.cache',

  base: `/rfxcom2mqtt/`,

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
   theme: hopeTheme({
    repo: 'sguernion/rfxcom2mqtt',
    repoLabel: 'GitHub',
    docsDir: 'src',
    lastUpdated: false,
    navbar,
    sidebar,
    contributors: false,
    iconAssets: "fontawesome",
  }),

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: []
});
export default conf;
