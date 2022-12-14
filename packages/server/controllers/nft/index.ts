import { FastifyRegister } from 'fastify';
import { type, string, number, literal, union, intersection, partial } from 'io-ts';
import { BadRequest } from 'http-errors';
import { AppDataSource } from '~/orm/data-source';
import { NftRequest } from '~/orm/entity/nftRequest';

import { assertAdmin, assertValidation, assertVerifySign } from '~/utils';
import { config } from '~/config';
import { Notification } from '~/orm';
import { socketService } from '~/service';

export const nftController: Parameters<FastifyRegister>[0] = (fastify, _opts, done) => {
  fastify.post('/request', async (req) => {
    const body = assertValidation(req.body, type({
      address: string,
      groupId: number,
      nonce: number,
      memo: string,
      sign: string,
    }));
    assertVerifySign(body);

    const notifications = await AppDataSource.manager.transaction(async (transactionManager) => {
      const item = await NftRequest.add({
        by: body.address,
        groupId: body.groupId,
        memo: body.memo,
        reply: '',
        status: 'pending',
      }, transactionManager);
      return Promise.all((config.admin ?? []).map((v) => Notification.add({
        actionObjectId: '',
        actionObjectType: '',
        from: body.address,
        groupId: body.groupId,
        objectId: String(item.id),
        objectType: 'nftrequest',
        status: 'unread',
        timestamp: Date.now(),
        to: v,
        type: 'nftrequest',
      }, transactionManager)));
    });

    const packedNotification = await Notification.appendExtra(notifications);
    packedNotification.forEach((v) => {
      socketService.send({
        groupId: v.groupId,
        event: 'notification',
        data: v,
        userAddress: v.to,
      });
    });

    return { status: 0 };
  });

  fastify.post('/request/list', async (req) => {
    const body = assertValidation(req.body, intersection([
      type({
        address: string,
        nonce: number,
        sign: string,
        offset: number,
        limit: number,
      }),
      partial({
        filter: union([
          literal('all'),
          literal('pending'),
          literal('rejected'),
          literal('approved'),
        ]),
      }),
    ]));
    assertVerifySign(body);
    assertAdmin(body.address);

    const query = AppDataSource.manager.createQueryBuilder()
      .select('req')
      .from(NftRequest, 'req')
      .orderBy('req.id', 'DESC')
      .offset(body.offset)
      .limit(Math.min(body.limit, 500));

    if (body.filter && ['approved', 'rejected', 'pending'].includes(body.filter)) {
      query.where('req.status = :status', { status: body.filter });
    }

    const items = await query.getMany();

    await NftRequest.pack(items);

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

    const notification = await AppDataSource.manager.transaction(async (transactionManager) => {
      await transactionManager.save(NftRequest, item);
      return Notification.add({
        from: body.address,
        groupId: item.groupId,
        actionObjectId: '',
        actionObjectType: '',
        objectId: String(item.id),
        objectType: 'nftrequest',
        status: 'unread',
        timestamp: Date.now(),
        to: item.by,
        type: 'nftrequestresponse',
      }, transactionManager);
    });

    await Notification.appendExtra(notification);

    socketService.send({
      groupId: item.groupId,
      event: 'notification',
      data: notification,
      userAddress: item.by,
    });

    return item;
  });

  done();
};
