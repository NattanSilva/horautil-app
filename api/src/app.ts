/**
 * Construção da aplicação Fastify (PRD §8).
 *
 * Registra plugins de segurança, validação/serialização Zod, documentação Swagger
 * e todas as rotas sob o prefixo versionado `/v1`.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from '@fastify/type-provider-zod';
import { env } from './config/env.js';
import { registerErrorHandler } from './shared/error-handler.js';
import { loggerOptions } from './shared/logger.js';
import { registerRateLimit, registerSecurity } from './plugins/security.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { profileRoutes } from './modules/profile/profile.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { walletRoutes } from './modules/wallet/wallet.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerOptions,
    bodyLimit: 1024 * 1024,
    trustProxy: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);

  await registerSecurity(app);
  await registerRateLimit(app);

  await app.register(cookie);
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(sensible);

  if (env.ENABLE_SWAGGER) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'HoraUtil API',
          description: 'API de troca de horas por habilidades (PRD v1.0 — MVP).',
          version: '1.0.0',
        },
        servers: [{ url: '/v1' }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  await app.register(
    async (v1) => {
      await v1.register(authRoutes);
      await v1.register(catalogRoutes);
      await v1.register(profileRoutes);
      await v1.register(searchRoutes);
      await v1.register(walletRoutes);
    },
    { prefix: '/v1' },
  );

  app.get('/health', { schema: { hide: true } }, async () => ({ status: 'ok' }));

  return app;
}
