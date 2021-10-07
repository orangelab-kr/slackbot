import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { Kickboard } from '..';

export const getLocationCommand: Middleware<SlackCommandMiddlewareArgs> =
  async (ctx) => {
    await ctx.ack();
    const { text } = ctx.body;
    if (text.length !== 6) {
      await ctx.say('킥보드 코드를 입력해주세요. (ex. DE20KP)');
      return;
    }

    const kickboard = await Kickboard.getKickboardIdByCode(text);
    if (!kickboard) {
      await ctx.say('해당 킥보드를 찾을 수 없습니다.');
      return;
    }

    const { kickboardCode, kickboardId } = kickboard;
    try {
      const { createdAt, gps } = await kickboard.getLatestStatus();
      const location = `${gps.latitude},${gps.longitude}`;
      await ctx.say(
        `${kickboardCode}(${kickboardId}) 킥보드의 위치는 아래와 같습니다.

· 킥보드 업데이트: ${createdAt.toString()}
· 킥보드 좌표: https://map.kakao.com/link/map/${kickboardCode},${location}
· 관리자 URL: https://console.firebase.google.com/u/0/project/hikick-dfcb5/firestore/data/~2Fkick~2F${kickboardId}`
      );
    } catch (err: any) {
      await ctx.say(
        `*${kickboardCode}(${kickboardId})* 킥보드 위치 정보를 가져올 수 없습니다. ${err.message}`
      );
    }
  };
