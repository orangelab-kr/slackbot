import { App } from '@slack/bolt';
import admin from 'firebase-admin';
import {
  getLightOffCommand,
  getLightOnCommand,
  getPaidCommand,
  getRebootCommand,
  getStartCommand,
  getStopCommand,
  getTerminateCommand,
  getUnpaidCommand,
  logger
} from '.';

export * from './commands';
export * from './controllers';
export * from './tools';

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIAL || '{}')
  ),
});

export const auth = admin.auth();
export const firestore = admin.firestore();

async function main() {
  const app = new App({
    socketMode: true,
    appToken: String(process.env.SLACK_APP_TOKEN),
    token: String(process.env.SLACK_BOT_TOKEN),
    signingSecret: String(process.env.SLACK_SIGNING_SECRET),
  });

  app.command('/paid', getPaidCommand);
  app.command('/reboot', getRebootCommand);
  app.command('/start', getStartCommand);
  app.command('/stop', getStopCommand);
  app.command('/lighton', getLightOnCommand);
  app.command('/lightoff', getLightOffCommand);
  app.command('/unpaid', getUnpaidCommand);
  app.command('/terminate', getTerminateCommand);

  logger.info('[Main] 서버를 시작하는 중입니다.');
  await app.start(Number(process.env.PORT) || 3000);
  logger.info('[Main] 서버가 시작되었습니다.');

  app.error((err) => {
    logger.error(`[Main] 오류가 발생하여 서버를 재시작합니다. ${err.message}`);

    logger.error(err.stack);
    process.exit(1);
  });
}

main();
