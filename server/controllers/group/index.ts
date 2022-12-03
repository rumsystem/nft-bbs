import { FastifyRegister } from 'fastify';
import { type, string } from 'io-ts';
import { BadRequest } from 'http-errors';
import QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { assertValidation } from '~/utils';
import { GroupStatus } from '~/orm/entity/groupStatus';
import { isLeft, tryCatch } from 'fp-ts/lib/Either';

export const groupController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.post('/join', async (req) => {
    const params = assertValidation(type({
      seedUrl: string,
    }).decode(req.body));
    const seedUrl = params.seedUrl;

    const seed = tryCatch(
      () => QuorumLightNodeSDK.utils.restoreSeedFromUrl(seedUrl),
      (v) => v as Error,
    );

    if (isLeft(seed)) { throw new BadRequest('invalid seed url'); }
    if (!seed.right.urls.length) { throw new BadRequest('invalid seed url'); }

    const groupId = seed.right.group_id;

    if (await GroupStatus.has(groupId)) {
      return {
        status: 0,
        msg: `group ${groupId} already joined`,
      };
    }

    await GroupStatus.add({
      groupId,
      seedUrl,
      startTrx: '',
    });

    return {
      status: 0,
      msg: `group ${groupId} joined`,
    };
  });

  done();
};
