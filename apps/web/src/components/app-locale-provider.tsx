"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_APP_LOCALE,
  getLocaleDirection,
  resolveAppLocale,
  translate,
  translateCommon,
  type AppDirection,
  type AppLocale,
  type AppMessageKey,
} from "@/lib/app-i18n";

interface AppLocaleContextValue {
  locale: AppLocale;
  dir: AppDirection;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: AppMessageKey, params?: Record<string, string | number>) => string;
  tc: (value: string, params?: Record<string, string | number>) => string;
}

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

const translatedTextNodes = new WeakMap<Text, string>();

const defaultAppLocaleContext: AppLocaleContextValue = {
  locale: DEFAULT_APP_LOCALE,
  dir: getLocaleDirection(DEFAULT_APP_LOCALE),
  setLocale: async () => undefined,
  t: (key, params) => translate(DEFAULT_APP_LOCALE, key, params),
  tc: (text, params) => translateCommon(DEFAULT_APP_LOCALE, text, params),
};

export function AppLocaleProvider({ children, initialLocale = DEFAULT_APP_LOCALE }: Readonly<{ children: ReactNode; initialLocale?: AppLocale }>) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<AppLocale>(() => resolveAppLocale(initialLocale));
  const dir = getLocaleDirection(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [dir, locale]);

  useEffect(() => {
    if (locale !== "ar") {
      restoreDocumentText();
      return undefined;
    }

    translateDocumentText(locale);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          translateNodeText(node, locale);
        }
        if (mutation.type === "characterData") {
          translateNodeText(mutation.target, locale);
        }
      }
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });

    return () => observer.disconnect();
  }, [locale]);

  const setLocale = useCallback(
    async (nextLocale: AppLocale) => {
      const resolvedLocale = resolveAppLocale(nextLocale);
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: resolvedLocale }),
      });

      if (!response.ok) {
        throw new Error("Unable to update language preference.");
      }

      setLocaleState(resolvedLocale);
      router.refresh();
    },
    [router],
  );

  const value = useMemo<AppLocaleContextValue>(
    () => ({
      locale,
      dir,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      tc: (text, params) => translateCommon(locale, text, params),
    }),
    [dir, locale, setLocale],
  );

  return <AppLocaleContext.Provider value={value}>{children}</AppLocaleContext.Provider>;
}

export function useAppLocale(): AppLocaleContextValue {
  const value = useContext(AppLocaleContext);
  if (!value) {
    return defaultAppLocaleContext;
  }
  return value;
}

export function useT(namespace?: string): (key: AppMessageKey | string, params?: Record<string, string | number>) => string {
  const { locale } = useAppLocale();
  return useCallback(
    (key, params) => {
      const fullKey = namespace && !key.includes(".") ? `${namespace}.${key}` : key;
      return translate(locale, fullKey as AppMessageKey, params);
    },
    [locale, namespace],
  );
}

function translateDocumentText(locale: AppLocale) {
  translateNodeText(document.body, locale);
}

function translateNodeText(node: Node, locale: AppLocale) {
  if (node.nodeType === Node.TEXT_NODE) {
    translateTextNode(node as Text, locale);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;
  if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "BDI"].includes(element.tagName)) {
    return;
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text, locale);
    current = walker.nextNode();
  }
}

function translateTextNode(node: Text, locale: AppLocale) {
  const source = translatedTextNodes.get(node) ?? node.nodeValue ?? "";
  const match = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const body = match?.[2] ?? "";
  if (!body || /\d/.test(body)) {
    return;
  }

  const translated = translateCommon(locale, body);
  if (translated === body) {
    return;
  }

  if (!translatedTextNodes.has(node)) {
    translatedTextNodes.set(node, source);
  }
  const nextValue = `${match?.[1] ?? ""}${translated}${match?.[3] ?? ""}`;
  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue;
  }
}

function restoreDocumentText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const original = translatedTextNodes.get(current as Text);
    if (original !== undefined) {
      current.nodeValue = original;
      translatedTextNodes.delete(current as Text);
    }
    current = walker.nextNode();
  }
}
