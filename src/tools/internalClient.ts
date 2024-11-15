import {
  DiscountPermission,
  FranchisePermission,
  InsurancePermission,
  InternalDiscountClient,
  InternalFranchiseClient,
  InternalInsuranceClient,
  InternalKickboardClient,
  InternalLocationClient,
  InternalPlatformClient,
  InternalWebhookClient,
  KickboardPermission,
  LocationPermission,
  PlatformPermission,
  WebhookPermission,
} from '@hikick/openapi-internal-sdk';

export class InternalClient {
  public static getDiscount(
    permissions?: DiscountPermission[],
    email = 'system@hikick.kr'
  ): InternalDiscountClient {
    const client = new InternalDiscountClient({
      secretKey: process.env.HIKICK_OPENAPI_DISCOUNT_KEY || '',
      issuer: process.env.HIKICK_OPENAPI_ISSUER || '',
      permissions,
      email,
    });

    return client;
  }

  public static getWebhook(
    permissions?: WebhookPermission[],
    email = 'system@hikick.kr'
  ): InternalWebhookClient {
    const client = new InternalWebhookClient({
      secretKey: process.env.HIKICK_OPENAPI_WEBHOOK_KEY || '',
      issuer: process.env.HIKICK_OPENAPI_ISSUER || '',
      permissions,
      email,
    });

    return client;
  }

  public static getKickboard(
    permissions?: KickboardPermission[],
    email = 'system@hikick.kr'
  ): InternalKickboardClient {
    const client = new InternalKickboardClient({
      secretKey: process.env.HIKICK_OPENAPI_KICKBOARD_KEY || '',
      issuer: process.env.HIKICK_OPENAPI_ISSUER || '',
      permissions,
      email,
    });

    return client;
  }

  public static getFranchise(
    permissions?: FranchisePermission[],
    email = 'system@hikick.kr'
  ): InternalFranchiseClient {
    const client = new InternalFranchiseClient({
      secretKey: process.env.HIKICK_OPENAPI_FRANCHISE_KEY || '',
      issuer: process.env.HIKICK_OPENAPI_ISSUER || '',
      permissions,
      email,
    });

    return client;
  }

  public static getPlatform(
    permissions?: PlatformPermission[],
    email = 'system@hikick.kr'
  ): InternalPlatformClient {
    const client = new InternalPlatformClient({
      secretKey: process.env.HIKICK_OPENAPI_PLATFORM_KEY || '',
      issuer: process.env.HIKICK_OPENAPI_ISSUER || '',
      permissions,
      email,
    });

    return client;
  }

  public static getInsurance(
    permissions?: InsurancePermission[],
    email = 'system@hikick.kr'
  ): InternalInsuranceClient {
    const client = new InternalInsuranceClient({
      secretKey: process.env.HIKICK_OPENAPI_INSURANCE_KEY || '',
      issuer: process.env.HIKICK_OPENAPI_ISSUER || '',
      permissions,
      email,
    });

    return client;
  }

  public static getLocation(
    permissions?: LocationPermission[],
    email = 'system@hikick.kr'
  ): InternalLocationClient {
    const client = new InternalLocationClient({
      secretKey: process.env.HIKICK_OPENAPI_LOCATION_KEY || '',
      issuer: process.env.HIKICK_OPENAPI_ISSUER || '',
      permissions,
      email,
    });

    return client;
  }
}
