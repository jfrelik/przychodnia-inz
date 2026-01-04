import { DrizzleError, DrizzleQueryError } from 'drizzle-orm';
import { DatabaseError } from 'pg';

type ErrorHandler = (error: DatabaseError) => {
	message: string;
	constraint: string | null;
};

const PostgresErrorHandlers: Record<string, ErrorHandler> = {
	'23505': (error) => ({
		message: 'Znaleziono zduplikowany wpis dla unikalnego pola.',
		constraint: error.constraint || null,
	}),
	'23503': (error) => ({
		message:
			'Wystąpiło naruszenie klucza obcego. Rekord, do którego próbujesz się odwołać, nie istnieje.',
		constraint: error.constraint || null,
	}),
	'22P02': () => ({
		message: 'Podane dane mają nieprawidłowy format (np. nieprawidłowy UUID).',
		constraint: null,
	}),
	'23514': (error) => ({
		message: 'Naruszono ograniczenie sprawdzające.',
		constraint: error.constraint || null,
	}),
	'23502': (error) => ({
		message: `Brakuje wymaganego pola. Kolumna '${error.column}' nie może być pusta.`,
		constraint: error.column || null,
	}),
	'42703': (error) => ({
		message: 'W zapytaniu odwołano się do niezdefiniowanej kolumny.',
		constraint: error.column || null,
	}),
	'42601': () => ({
		message: 'Wystąpił błąd składni w zapytaniu do bazy danych.',
		constraint: null,
	}),
	'25000': () => ({
		message:
			'Transakcja nie powiodła się: wystąpił problem z integralnością danych w transakcji bazodanowej.',
		constraint: null,
	}),
	'08006': () => ({
		message:
			'Połączenie z bazą danych nie powiodło się. Baza danych może być niedostępna.',
		constraint: null,
	}),
	'42P01': () => ({
		message: 'Wskazana tabela nie istnieje w bazie danych.',
		constraint: null,
	}),
	'40001': () => ({
		message:
			'Błąd serializacji transakcji. Proszę ponowić transakcję, ponieważ nie mogła zostać ukończona z powodu równoczesnych modyfikacji.',
		constraint: null,
	}),
	default: (error) => ({
		message: `Wystąpił błąd bazy danych: ${error.message}`,
		constraint: null,
	}),
};

export function getDbErrorMessage(error: unknown): {
	message: string;
	constraint: string | null;
} {
	if (
		error instanceof DrizzleQueryError &&
		error.cause instanceof DatabaseError
	) {
		const originalError = error.cause;
		const handler = PostgresErrorHandlers[originalError.code ?? 'default'];

		if (handler) {
			return handler(originalError);
		}

		return {
			message: `Wystąpił błąd bazy danych: ${originalError.message}`,
			constraint: null,
		};
	}

	if (error instanceof DrizzleError || error instanceof Error) {
		return {
			message: error.message || 'Wystąpił nieoczekiwany błąd.',
			constraint: null,
		};
	}

	return { message: 'Wystąpił nieznany błąd.', constraint: null };
}
