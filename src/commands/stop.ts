import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';

import { Kickboard } from '../controllers/kickboard';

export const getStopCommand: Middleware<SlackCommandMiddlewareArgs> = async (
  ctx
) => {
  await ctx.ack();
  const { text } = ctx.body;
  if (text.length !== 6) {
    await ctx.say('킥보드 코드를 입력해주세요. (ex. DE20KP)');
    return;
  }

  const code = text.toUpperCase();
  const id = await Kickboard.getKickboardIdByCode(code);
  if (!id) {
    await ctx.say('해당 킥보드를 찾을 수 없습니다.');
    return;
  }

  Kickboard.stop(id);
  await ctx.say(`*${code}(${id})* 킥보드를 종료하였습니다.`);
};
