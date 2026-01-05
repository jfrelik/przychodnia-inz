# Przychodnia — aplikacja Nuxt (Projekt inżynierski PJATK)

Aplikacja do obsługi przychodni (pacjenci, lekarze, wizyty, recepty), zbudowana w oparciu o Nuxt 4 + Vue 3, PostgreSQL oraz Drizzle ORM. Uwierzytelnianie realizuje Better Auth. Do kolejek i wysyłki maili używany jest BullMQ + Redis (Valkey).

## Technologie

- Nuxt 4 + Vue 3 + Nuxt UI
- PostgreSQL 17 + Drizzle ORM
- Better Auth
- BullMQ + Valkey
- Nodemailer + Nuxt Email Renderer
- TypeScript

## Funkcjonalności (skrót)

- Panel pacjenta: umawianie i anulowanie wizyt, recepty, wyniki badań, zalecenia
- Panel lekarza: dyspozycje, wizyty, historia pacjentów
- Panel admina: zarządzanie użytkownikami, specjalizacjami, gabinetami, logami
- Kolejki do obsługi maili (potwierdzenia, przypomnienia, odwołania)

## Wymagania

- Node.js ≥ 24.12.0
- pnpm
- PostgreSQL 17
- Valkey

## Konfiguracja środowiska

1. Zainstaluj zależności

```bash
pnpm install
```

2. Skonfiguruj zmienne środowiskowe (`.env` w katalogu głównym)

```env
NUXT_DATABASE_URL=postgres://postgres:postgres@localhost:5432/db
NUXT_REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=dev-secret-or-random
BETTER_AUTH_URL=http://localhost:3000
```

## Uruchomienie w trybie deweloperskim

```bash
pnpm run dev
```

Aplikacja będzie dostępna pod `http://localhost:3000`.

## Uruchomienie przez Docker Compose

```bash
docker compose up --build
```

Projekt inżynierski realizowany podczas procesu nauczania w Polsko‑Japońskiej Akademii Technik Komputerowych (PJATK).
