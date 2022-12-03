import { FastifyRegister } from 'fastify';
import { type, string, number, literal, union } from 'io-ts';
import { BadRequest } from 'http-errors';
import { AppDataSource } from '~/orm/data-source';
import { NftRequest } from '~/orm/entity/nftRequest';

import { assertAdmin, assertValidation, assertVerifySign } from '~/utils';

export const nftController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.post('/request', async (req) => {
    const body = assertValidation(req.body, type({
      address: string,
      groupId: string,
      nonce: number,
      memo: string,
      sign: string,
    }));
    assertVerifySign(body);

    await NftRequest.add({
      by: body.address,
      groupId: body.groupId,
      memo: body.memo,
      reply: '',
      status: 'pending',
    });

    return { status: 0 };
  });

  fastify.post('/request/list', async (req) => {
    const body = assertValidation(req.body, type({
      address: string,
      nonce: number,
      sign: string,
      offset: number,
      limit: number,
    }));
    assertVerifySign(body);
    assertAdmin(body.address);

    const items = await AppDataSource.manager.createQueryBuilder()
      .select('req')
      .from(NftRequest, 'req')
      .orderBy('req.id', 'DESC')
      .offset(body.offset)
      .limit(Math.min(body.limit, 500))
      .getMany();

    return items;
  });


  fastify.post('/request/reply', async (req) => {
    const body = assertValidation(req.body, type({
      address: string,
      nonce: number,
      sign: string,
      id: number,
      type: union([literal('rejected'), literal('approved')]),
      reply: string,
    }));
    assertVerifySign(body);
    assertAdmin(body.address);
    const item = await NftRequest.get(body.id);
    if (!item) {
      throw new BadRequest(`id ${body.id} not found`);
    }

    item.reply = body.reply;
    item.status = body.type;
    await AppDataSource.manager.save(NftRequest, item);
  });

  done();
};