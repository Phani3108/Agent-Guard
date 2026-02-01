import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap() {
	const port = process.env.PORT ? Number(process.env.PORT) : 4000;
	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }));

	app.setGlobalPrefix('');

	await app.listen({ port, host: '0.0.0.0' });
	// eslint-disable-next-line no-console
	console.log(`Sentinel API listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
	// eslint-disable-next-line no-console
	console.error('Fatal error during bootstrap', err);
	process.exit(1);
});

