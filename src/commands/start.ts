import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';

import { Kickboard } from '../controllers/kickboard';

export const getStartCommand: Middleware<SlackCommandMiddlewareArgs> = async (
  ctx
) => {
  await ctx.ack();
  const { text } = ctx.body;
  if (text.length !== 6) {
    await ctx.ack('킥보드 코드를 입력해주세요. (ex. DE20KP)');
    return;
  }

  const kickboard = await Kickboard.getKickboardIdByCode(text);
  if (!kickboard) {
    await ctx.say('해당 킥보드를 찾을 수 없습니다.');
    return;
  }

  const { kickboardCode, kickboardId } = kickboard;
  try {
    await kickboard.start();
    await ctx.say(
      `*${kickboardCode}(${kickboardId})* 킥보드를 시작하였습니다.`
    );
  } catch (err) {
    await ctx.say(
      `*${kickboardCode}(${kickboardId})* 킥보드를 조작하는데 실패하였습니다. ${err.message}`
    );
  }
};
