import { firestore, mqttClient } from '..';

export class Kickboard {
  public static async getKickboardIdByCode(
    code: string
  ): Promise<string | undefined> {
    let id;
    const kickCol = firestore.collection('kick');
    const kickboards = await kickCol.where('code', '==', code).limit(1).get();
    kickboards.forEach((kickboard) => (id = kickboard.data().id));
    return id;
  }

  public static reboot(id: string): void {
    mqttClient.publish(id, JSON.stringify({ cmd: 'restart' }));
  }

  public static start(id: string): void {
    mqttClient.publish(id, JSON.stringify({ cmd: 'start' }));
  }

  public static stop(id: string): void {
    mqttClient.publish(id, JSON.stringify({ cmd: 'stop' }));
  }

  public static lightOn(id: string): void {
    mqttClient.publish(id, JSON.stringify({ cmd: 'lighton', value: '0,0' }));
  }

  public static lightOff(id: string): void {
    mqttClient.publish(id, JSON.stringify({ cmd: 'lightoff' }));
  }
}
