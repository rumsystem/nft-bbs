import 'reflect-metadata';
import './utils/alias';
import './utils/env';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { performance } from 'perf_hooks';
import * as fs from 'fs/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import pino from 'pino';

import { initDB } from '~/orm';
import { controllers } from '~/controllers';
import { initService, disposeService } from '~/service';
import { getLoggerWrite, patchLogger } from './utils';

export type {
  Comment, GroupInfo, ImageFile,
  Notification, Post, Profile, UniqueCounter,
} from '~/orm/entity';

export type { SocketIOEventMap } from '~/service/socket';

const port = Number(process.env.PORT) || 8002;

const main = async () => {
  console.log('starting server...');
  await fs.mkdir(path.join(__dirname, 'logs')).catch(() => 1);

  const appLogFile = createWriteStream(path.join(__dirname, 'logs/app.log'), { flags: 'a' });
  const pollingLogFile = createWriteStream(path.join(__dirname, 'logs/polling.log'), { flags: 'a' });

  const fastify = Fastify({
    logger: {
      level: 'info',
      base: undefined,
      stream: {
        write: getLoggerWrite(appLogFile),
      },
    },
  });

  (globalThis as any).log = fastify.log;
  (globalThis as any).pollingLog = pino({
    level: 'info',
    base: undefined,
  }, {
    write: getLoggerWrite(pollingLogFile),
  });
  (globalThis as any).s = fastify;
  patchLogger(log);
  patchLogger(pollingLog);

  await log.time('init db', () => initDB());

  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    fastify.getDefaultJsonParser('ignore', 'ignore'),
  );

  fastify.register(cors, {
    credentials: true,
    origin: true,
  });

  fastify.addHook('onClose', (_fastify, done) => {
    appLogFile.end();
    pollingLogFile.end();
    disposeService();
    done();
  });

  fastify.register(controllers);

  initService(fastify);

  await fastify.listen({ host: '::', port }).then(() => {
    fastify.log.info(`app listen on port ${port}.`);
  });
};

main();
