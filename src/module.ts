import { addPlugin, createResolver, defineNuxtModule, extendPages } from '@nuxt/kit'
import type { HookResult } from '@nuxt/schema'
import { setupDevToolsUI } from './devtools'

export interface ServerFunctions {
  getLocalesAndTranslations: () => Promise<{ locale: string, files: string[], content: Record<string, unknown> }[]>
}

export interface ClientFunctions {
  showNotification: (message: string) => void
}

export type Plural = (translation: string, count: number, _locale: string) => string

export interface Locale {
  code: string
  iso?: string
  dir?: 'rtl' | 'ltr'
}

// Module options TypeScript interface definition
export interface ModuleOptions {
  locales?: Locale[]
  mata?: boolean
  defaultLocale?: string
  translationDir?: string
  autoDetectLanguage?: boolean,
  plural?: string
}

declare module '@nuxt/schema' {
  interface ConfigSchema {
    publicRuntimeConfig?: {
      i18nConfig?: ModuleOptions
    }
  }
  interface NuxtConfig {
    i18nConfig?: ModuleOptions
  }
  interface NuxtOptions {
    i18nConfig?: ModuleOptions
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-i18n-micro',
    configKey: 'i18n',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    locales: [
      { code: 'en', iso: 'en_EN' },
      { code: 'de', iso: 'de_DE' },
      { code: 'ru', iso: 'ru_RU' },
    ],
    mata: true,
    defaultLocale: 'en',
    translationDir: 'locales',
    autoDetectLanguage: true,
    plural: `function (translation, count, _locale) {
      const forms = translation.toString().split('|')
      if (count === 0 && forms.length > 2) {
        return forms[0].trim() // Case for "no apples"
      }
      if (count === 1 && forms.length > 1) {
        return forms[1].trim() // Case for "one apple"
      }
      return (forms.length > 2 ? forms[2].trim() : forms[forms.length - 1].trim()).replace('{count}', count.toString())
    }`
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.public.i18nConfig = { ...options, rootDir: nuxt.options.rootDir, plural: options.plural?.toString() }

    addPlugin({
      src: resolver.resolve('./runtime/01.plugin'),
      order: 1,
    })

    addPlugin({
      src: resolver.resolve('./runtime/02.meta'),
      order: 2,
    })

    addPlugin({
      src: resolver.resolve('./runtime/03.define'),
      order: 2,
    })

    if (options.autoDetectLanguage) {
      addPlugin({
        src: resolver.resolve('./runtime/04.auto-detect'),
        mode: 'client',
        order: 3
      })
    }

    const localeRegex = options.locales!
      .filter(locale => locale.code !== options.defaultLocale) // Фильтрация локалей, исключая дефолтную
      .map(locale => locale.code) // Извлечение поля code из каждого объекта Locale
      .join('|') // Объединение всех code в строку, разделенную символом '|'

    extendPages((pages) => {
      nuxt.options.generate.routes = Array.isArray(nuxt.options.generate.routes) ? nuxt.options.generate.routes : []
      // Получаем все страницы приложения
      const pagesList = nuxt.options.generate.routes || []

      const newRoutes = pages.map((page) => {
        options.locales!.forEach((locale) => {
          if (locale.code !== options.defaultLocale) {
            pages.forEach((page) => {
              pagesList.push(`/${locale}${page}`)
            })
          }
        })
        return {
          ...page,
          path: `/:locale(${localeRegex})${page.path}`,
          name: `localized-${page.name}`,
          meta: {
            ...page.meta,
          },
        }
      })
      // Добавляем новые маршруты
      pages.push(...newRoutes)
    })

    // nuxt.hook('nitro:config', (nitroConfig) => {
    //   const routes = nitroConfig.prerender?.routes || []
    //
    //   nuxt.options.generate.routes = Array.isArray(nuxt.options.generate.routes) ? nuxt.options.generate.routes : []
    //   // Получаем все страницы приложения
    //   const pages = nuxt.options.generate.routes || []
    //
    //   // Генерируем маршруты для всех локалей, кроме дефолтной
    //   options.locales!.forEach((locale) => {
    //     if (locale.code !== options.defaultLocale) {
    //       pages.forEach((page) => {
    //         routes.push(`/${locale}${page}`)
    //       })
    //     }
    //   })
    //
    //   // Обновляем опцию routes в конфигурации Nitro
    //   nitroConfig.prerender = nitroConfig.prerender || {}
    //   nitroConfig.prerender.routes = routes
    // })

    nuxt.hook('prerender:routes', async (prerenderRoutes) => {
      const routesSet = prerenderRoutes.routes
      const additionalRoutes = new Set<string>()

      // Проходим по каждому существующему маршруту и добавляем локализованные версии, кроме дефолтной локали
      routesSet.forEach((route) => {
        options.locales!.forEach((locale) => {
          if (locale.code !== options.defaultLocale) {
            if (route === '/') {
              additionalRoutes.add(`/${locale.code}`)
            }
            else {
              additionalRoutes.add(`/${locale.code}${route}`)
            }
          }
        })
      })

      // Добавляем новые локализованные маршруты к существующим
      additionalRoutes.forEach(route => routesSet.add(route))
    })

    // Setup DevTools integration
    if (nuxt.options.dev)
      setupDevToolsUI(options, resolver.resolve)
  },
})

export interface ModuleHooks {
  'i18n:register': (
    registerModule: (translations: unknown, locale: string) => void
  ) => HookResult
}

declare module '@nuxt/schema' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface NuxtHooks extends ModuleHooks {}
}
