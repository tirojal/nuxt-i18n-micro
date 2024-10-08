import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    defaultLocale: 'en',
    lazy: true,
    detectBrowserLanguage: false,
    langDir: 'locales',
    locales: [
      {
        code: 'en',
        language: 'en-US',
        file: 'en.json',
      },
      {
        code: 'ru',
        language: 'ru-RU',
        file: 'ru.json',
      },
      {
        code: 'de',
        language: 'de-De',
        file: 'de.json',
      },
    ],
  },
  devtools: { enabled: true },
  experimental: {
    externalVue: false,
  },
  compatibilityDate: '2024-08-14',
})
