declare module 'leo-profanity' {
  interface LeoProfanity {
    check(text: string): boolean;

    clean(text: string): string;

    add(words: string | string[]): void;

    remove(words: string | string[]): void;

    clear(): void;

    list(): string[];

    loadDictionary(lang: string): void;
  }

  const leoProfanity: LeoProfanity;
  export = leoProfanity;
}
