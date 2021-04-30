import { App, LogLevel } from '@slack/bolt';
import { getPaidCommand, logger } from '.';

export * from './tools';
export * from './commands';

async function main() {
  const app = new App({
    socketMode: true,
    appToken: String(process.env.SLACK_APP_TOKEN),
    token: String(process.env.SLACK_BOT_TOKEN),
    signingSecret: String(process.env.SLACK_SIGNING_SECRET),
  });

  app.command('/paid', getPaidCommand);

  logger.info('[Main] 서버를 시작하는 중입니다.');
  await app.start(Number(process.env.PORT) || 3000);
  logger.info('[Main] 서버가 시작되었습니다.');
}

main();
