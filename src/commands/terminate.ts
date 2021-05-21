import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { getPrice } from '..';
import { Ride } from '../controllers/ride';

export const getTerminateCommand: Middleware<SlackCommandMiddlewareArgs> = async (
  ctx
) => {
  await ctx.ack();
  const { text } = ctx.body;
  if (!text.startsWith('+82') || text.length !== 13) {
    await ctx.say('반드시 +82로 시작하는 전화번호 13자리이여야 합니다.');
    return;
  }

  const user = await Ride.getUserByPhone(text);
  if (!user) {
    await ctx.say('사용자를 찾을 수 없습니다.');
    return;
  }

  const birthday = user.birthday.format('YYYY년 MM월 DD일');
  await ctx.say(`${user.username} ${user.phone} (${birthday})`);
  const rides = await Ride.getRides(user);
  if (rides.length <= 0) {
    await ctx.say('킥보드를 이용중이지 않습니다.');
    return;
  }

  for (const ride of rides) {
    const diff = ride.endedAt.diff(ride.startedAt, 'minutes');
    const price = await getPrice(ride.branch, diff);
    const startedAt = ride.startedAt.format('YYYY년 MM월 DD일 HH시 mm분');
    const endedAt = ride.endedAt.format('HH시 mm분');
    const usedAt = `- ${startedAt} ~ ${endedAt}(${diff}분, ${price.toLocaleString()}원)`;
    await ctx.say(usedAt);
    if (user.currentRide !== ride.rideId) {
      await ctx.say('중복 처리된 데이터입니다. 삭제 처리합니다.');
      await Ride.deleteRide(ride, user);
      continue;
    }

    await Ride.terminateRide(ride, user);
  }
};
