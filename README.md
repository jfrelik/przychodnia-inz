# Przychodnia — aplikacja Nuxt (Projekt inżynierski PJATK)

Aplikacja do obsługi przychodni (pacjenci, lekarze, wizyty, recepty), zbudowana w oparciu o Nuxt 4 + Vue 3, PostgreSQL oraz Drizzle ORM. Uwierzytelnianie realizuje Better Auth, a dokumentacja API jest dostępna w Scalar.

## Technologie

- Nuxt 4
- PostgreSQL + Drizzle ORM
- Better Auth
- TypeScript
- Scalar

## Wymagania

- Node.js ≥ 22.18.0
- pnpm
- PostgreSQL 17

## Konfiguracja środowiska

1. Zainstaluj zależności

```bash
pnpm install
```

2. Skonfiguruj zmienne środowiskowe (`.env` w katalogu głównym)

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/db
BETTER_AUTH_SECRET=dev-secret-or-random
BETTER_AUTH_URL=http://localhost:3000
```

## Uruchomienie w trybie deweloperskim

```bash
pnpm run dev
```

Aplikacja będzie dostępna pod `http://localhost:3000`.

## Dokumentacja API

- OpenAPI: `/_openapi.json`
- Podgląd w Scalar: `/docs`

Projekt inżynierski realizowany podczas procesu nauczania w Polsko‑Japońskiej Akademii Technik Komputerowych (PJATK).
