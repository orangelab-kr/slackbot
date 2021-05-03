import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';

import { Kickboard } from '../controllers/kickboard';

export const getLightOnCommand: Middleware<SlackCommandMiddlewareArgs> = async (
  ctx
) => {
  const { text } = ctx.body;
  if (text.length !== 6) {
    await ctx.ack('킥보드 코드를 입력해주세요. (ex. DE20KP)');
    return;
  }

  const code = text.toUpperCase();
  const id = await Kickboard.getKickboardIdByCode(code);
  if (!id) {
    await ctx.ack('해당 킥보드를 찾을 수 없습니다.');
    return;
  }

  await ctx.ack();
  Kickboard.lightOn(id);
  await ctx.say(`*${code}(${id})* 킥보드의 라이트를 켰습니다.`);
};
