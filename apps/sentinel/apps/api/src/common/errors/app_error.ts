export class AppError extends Error {
	constructor(message: string, public readonly code?: string, public readonly meta?: unknown) {
		super(message);
		this.name = 'AppError';
	}
}

