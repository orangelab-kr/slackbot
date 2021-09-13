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

const issuers: { stg?: string; prd?: string } = {
  stg: process.env.HIKICK_OPENAPI_STG_ISSUER,
  prd: process.env.HIKICK_OPENAPI_PRD_ISSUER,
};

const secretKeys: {
  stg: { [key: string]: any };
  prd: { [key: string]: any };
} = {
  stg: {
    'openapi-discount': process.env.HIKICK_OPENAPI_STG_DISCOUNT_KEY,
    'openapi-franchise': process.env.HIKICK_OPENAPI_STG_FRANCHISE_KEY,
    'openapi-insurance': process.env.HIKICK_OPENAPI_STG_INSURANCE_KEY,
    'openapi-kickboard': process.env.HIKICK_OPENAPI_STG_KICKBOARD_KEY,
    'openapi-location': process.env.HIKICK_OPENAPI_STG_LOCATION_KEY,
    'openapi-platform': process.env.HIKICK_OPENAPI_STG_PLATFORM_KEY,
    'openapi-ride': process.env.HIKICK_OPENAPI_STG_RIDE_KEY,
    'openapi-webhook': process.env.HIKICK_OPENAPI_STG_WEBHOOK_KEY,
  },
  prd: {
    'openapi-discount': process.env.HIKICK_OPENAPI_PRD_DISCOUNT_KEY,
    'openapi-franchise': process.env.HIKICK_OPENAPI_PRD_FRANCHISE_KEY,
    'openapi-insurance': process.env.HIKICK_OPENAPI_PRD_INSURANCE_KEY,
    'openapi-kickboard': process.env.HIKICK_OPENAPI_PRD_KICKBOARD_KEY,
    'openapi-location': process.env.HIKICK_OPENAPI_PRD_LOCATION_KEY,
    'openapi-platform': process.env.HIKICK_OPENAPI_PRD_PLATFORM_KEY,
    'openapi-ride': process.env.HIKICK_OPENAPI_PRD_RIDE_KEY,
    'openapi-webhook': process.env.HIKICK_OPENAPI_PRD_WEBHOOK_KEY,
  },
};

export const getGenerateTokenCommand: Middleware<SlackCommandMiddlewareArgs> =
  async (ctx) => {
    await ctx.ack();
    const args = ctx.body.text.split(' ');
    if (args.length < 2) {
      await ctx.say(
        '올바른 명령어를 입력해주세요. /generate-token <스테이지> <서비스명>'
      );

      return;
    }

    const serviceNames = Object.keys(services);
    if (!serviceNames.includes(args[0])) {
      await ctx.say(
        `<서비스명>은 다음 중 하나만 입력할 수 있습니다. ${serviceNames.join(
          ', '
        )}`
      );

      return;
    }

    const stages = Object.keys(secretKeys);
    if (!Object.keys(secretKeys).includes(args[1])) {
      await ctx.say(
        `<스테이지>는 다음 중 하나만 입력할 수 있습니다. ${stages.join(', ')}`
      );
    }

    const [serviceName, stage]: [string, 'stg' | 'prd'] = <any>args;
    const { user } = await ctx.client.users.info({
      user: ctx.command.user_id,
    });

    const issuer = issuers[stage];
    const email = user?.profile?.email || 'system@hikick.kr';
    const secretKey = secretKeys[stage][serviceName];
    const service = new services[serviceName]({ issuer, email, secretKey });

    try {
      await ctx.say(service.getAccessKey());
    } catch (err) {
      await ctx.say(`토큰을 생성할 수 없습니다. ${err.message}`);
    }
  };
