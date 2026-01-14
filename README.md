# Przychodnia — aplikacja Nuxt (Projekt inżynierski PJATK)

Aplikacja do obsługi przychodni (pacjenci, lekarze, recepcja, admin) zbudowana na Nuxt 4 + Vue 3.

## Stos technologiczny

- Nuxt 4 + Vue 3 + Nuxt UI
- Nitro + Drizzle ORM + PostgreSQL 17
- Better Auth
- BullMQ + Redis (Valkey) do kolejek
- Nodemailer + Nuxt Email Renderer
- TypeScript

## Architektura

- `app/` — warstwa kliencka (Vue 3 + Nuxt UI).
- `server/api/` — endpointy Nitro, walidacja Zod.
- `server/db/` — definicje schematu Drizzle.
- `emails/` — szablony maili renderowane po stronie serwera.

## Funkcjonalności

- Pacjent: rejestracja/logowanie, umawianie/odwoływanie wizyt, recepty, zalecenia, wyniki badań
- Lekarz: dyspozycje, podgląd wizyt, obsługa wizyty
- Recepcja: przypisywanie gabinetów, check-in pacjentów, kalendarz wizyt
- Admin: zarządzanie użytkownikami, specjalizacjami, gabinetami, logami

## Wymagania

- Node.js ≥ 24 i pnpm
- PostgreSQL 17
- Redis/Valkey

## Konfiguracja środowiska

1. Skopiuj `.env.example` do `.env` i uzupełnij wartości.
2. Zainstaluj zależności:

```bash
pnpm install
```

## Uruchomienie (dev)

```bash
pnpm run dev
```

Aplikacja: http://localhost:3000

## Uruchomienie przez Docker Compose

```bash
docker compose up --build
```
