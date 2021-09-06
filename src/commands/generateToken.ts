import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';
import {
  InternalDiscountClient,
  InternalFranchiseClient,
  InternalInsuranceClient,
  InternalKickboardClient,
  InternalLocationClient,
  InternalPlatformClient,
  InternalRideClient,
  InternalWebhookClient,
} from 'openapi-internal-sdk';

const services: { [key: string]: any } = {
  'openapi-discount': InternalDiscountClient,
  'openapi-franchise': InternalFranchiseClient,
  'openapi-insurance': InternalInsuranceClient,
  'openapi-kickboard': InternalKickboardClient,
  'openapi-location': InternalLocationClient,
  'openapi-platform': InternalPlatformClient,
  'openapi-ride': InternalRideClient,
  'openapi-webhook': InternalWebhookClient,
};

const secretKeys: { [key: string]: any } = {
  'openapi-discount': process.env.HIKICK_OPENAPI_DISCOUNT_KEY,
  'openapi-franchise': process.env.HIKICK_OPENAPI_FRANCHISE_KEY,
  'openapi-insurance': process.env.HIKICK_OPENAPI_INSURANCE_KEY,
  'openapi-kickboard': process.env.HIKICK_OPENAPI_KICKBOARD_KEY,
  'openapi-location': process.env.HIKICK_OPENAPI_LOCATION_KEY,
  'openapi-platform': process.env.HIKICK_OPENAPI_PLATFORM_KEY,
  'openapi-ride': process.env.HIKICK_OPENAPI_RIDE_KEY,
  'openapi-webhook': process.env.HIKICK_OPENAPI_WEBHOOK_KEY,
};

export const getGenerateTokenCommand: Middleware<SlackCommandMiddlewareArgs> =
  async (ctx) => {
    await ctx.ack();
    const { text } = ctx.body;
    if (!Object.keys(services).includes(text)) {
      await ctx.say(
        `다음 중 하나만 입력할 수 있습니다. ${Object.keys(services).join(', ')}`
      );

      return;
    }

    const { user } = await ctx.client.users.info({ user: ctx.command.user_id });
    const service = new services[text]({
      issuer: String(process.env.HIKICK_OPENAPI_ISSUER),
      email: user?.profile?.email || 'system@hikick.kr',
      secretKey: secretKeys[text],
    });

    try {
      await ctx.say(service.getAccessKey());
    } catch (err) {
      await ctx.say(`토큰을 생성할 수 없습니다. ${err.message}`);
    }
  };
