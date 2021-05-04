import {
  getLightOffCommand,
  getLightOnCommand,
  getRebootCommand,
  getStartCommand,
  getStopCommand,
  getUnpaidCommand,
} from './commands';
import { getPaidCommand, logger } from '.';

import { App } from '@slack/bolt';
import admin from 'firebase-admin';
import mqtt from 'mqtt';

export * from './tools';
export * from './commands';
export * from './controllers';

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIAL || '{}')
  ),
});

export const firestore = admin.firestore();
export const mqttClient = mqtt.connect(String(process.env.MQTT_URL), {
  username: String(process.env.MQTT_USERNAME),
  password: String(process.env.MQTT_PASSWORD),
});

const waitForConnect = () =>
  new Promise<void>((resolve) => {
    mqttClient.on('connect', () => {
      logger.info(`[Mqtt] 서버와 연결되었습니다.`);
      resolve();
    });
  });

async function main() {
  await waitForConnect();
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

  logger.info('[Main] 서버를 시작하는 중입니다.');
  await app.start(Number(process.env.PORT) || 3000);
  logger.info('[Main] 서버가 시작되었습니다.');
}

main();
