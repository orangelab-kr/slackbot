import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { Paid, getPrice } from '..';

export const getPaidCommand: Middleware<SlackCommandMiddlewareArgs> = async (
  ctx
) => {
  await ctx.ack();
  const { text } = ctx.body;
  if (!text.startsWith('+82') || text.length !== 13) {
    await ctx.ack('반드시 +82로 시작하는 전화번호 13자리이여야 합니다.');
    return;
  }

  const { user, rides } = await Paid.setPaiedByPhone(text);
  if (!user) {
    await ctx.say('사용자를 찾을 수 없습니다');
    return;
  }

  const birthday = user.birthday.format('YYYY년 MM월 DD일');
  await ctx.say(`${user.username} ${user.phone} (${birthday})`);
  if (rides.length <= 0) {
    await ctx.say('미수금이 없는 사용자입니다.');
    return;
  }

  for (const ride of rides) {
    const diff = ride.endedAt.diff(ride.startedAt, 'minutes');
    const price = await getPrice(ride.branch, diff);
    const startedAt = ride.startedAt.format('YYYY년 MM월 DD일 HH시 mm분');
    const endedAt = ride.endedAt.format('HH시 mm분');
    const usedAt = `- ${startedAt} ~ ${endedAt}(${diff}분, ${price.toLocaleString()}원)`;
    await ctx.say(usedAt);
  }

  await ctx.say(`미결제를 모두 처리하였습니다. ${rides.length}개`);
};
