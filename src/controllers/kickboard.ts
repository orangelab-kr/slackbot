import { InternalKickboard } from '@hikick/openapi-internal-sdk';
import { InternalClient } from '..';

export class Kickboard {
  public static async getKickboardIdByCode(
    kickboardCode: string
  ): Promise<InternalKickboard | null> {
    return InternalClient.getKickboard()
      .getKickboard(kickboardCode)
      .catch((e) => null);
  }
}
