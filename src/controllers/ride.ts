import dayjs, { Dayjs } from 'dayjs';
import {
  auth,
  firestore,
  getPrice,
  iamport,
  Kickboard,
  logger,
  send,
} from '..';

const sleep = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

interface User {
  uid: string;
  username: string;
  phone: string | null;
  currentRide: string | null;
  birthday: Dayjs;
  billingKeys: string[];
}

interface RideDetail {
  rideId: string;
  userId: string;
  branch: string;
  cost: number;
  coupon: string;
  kickboardName: string;
  kickboardId: string;
  payment?: string;
  startedAt: Dayjs;
  endedAt: Dayjs;
}

export class Ride {
  public static async getUserByPhone(phone: string): Promise<User | null> {
    let user: User | null = null;
    const userCol = firestore.collection('users');
    const users = await userCol.where('phone', '==', phone).limit(1).get();
    users.forEach((userDoc) => {
      const userData = userDoc.data();
      user = {
        uid: userDoc.id,
        username: userData.name,
        phone: userData.phone,
        currentRide: userData.curr_ride ? userData.curr_ride.id : null,
        birthday: dayjs(userData.birth._seconds * 1000),
        billingKeys: userData.billkey,
      };
    });

    return user;
  }

  public static async endRide(user: User) {
    const rides = await Ride.getRides(user);
    let i = 0;
    for (const ride of rides) {
      const now = dayjs();
      const user = await this.getUser(ride.userId);
      const diff = now.diff(ride.startedAt, 'minutes');
      const price = await getPrice(ride.branch, diff);
      const startedAt = ride.startedAt.format('YYYY년 MM월 DD일 HH시 mm분');
      const usedAt = `${startedAt} ~ (${diff}분, ${price.toLocaleString()}원)`;

      if (!user) {
        logger.warn(`사용자를 찾을 수 없습니다. ${JSON.stringify(user)}`);
        logger.warn(usedAt);
        continue;
      }

      if (!user.phone) {
        user.phone = await this.getPhoneByAuth(user);
        if (!user.phone) {
          logger.info(`이름 또는 전화번호가 올바르지 않습니다. 무시합니다.`);
          break;
        }
      }

      const birthday = user.birthday.format('YYYY년 MM월 DD일');
      logger.info(
        `${i++} >> ${user.username}님 ${user.phone} ${birthday} - ${usedAt}`
      );

      if (user.currentRide !== ride.rideId) {
        logger.info('중복 처리된 데이터입니다. 삭제 처리합니다.');
        await this.deleteRide(ride, user);
        continue;
      }

      await this.terminateRide(ride, user);
    }
  }

  public static async isLastRide(ride: RideDetail): Promise<boolean> {
    const rideCol = firestore.collection('ride');
    const rides = await rideCol
      .where('kickName', '==', ride.kickboardId)
      .orderBy('start_time', 'desc')
      .limit(1)
      .get();

    let rideId;
    rides.forEach((res) => (rideId = res.id));
    return rideId ? ride.rideId === rideId : false;
  }

  public static async getUser(uid: string): Promise<User | undefined> {
    const userCol = firestore.collection('users');
    const userDoc = await userCol.doc(uid).get();
    const userData = userDoc.data();
    if (!userData) return;

    return {
      uid: userDoc.id,
      username: userData.name,
      phone: userData.phone,
      currentRide: userData.curr_ride ? userData.curr_ride.id : null,
      birthday: dayjs(userData.birth._seconds * 1000),
      billingKeys: userData.billkey,
    };
  }

  public static async terminateRide(
    ride: RideDetail,
    user: User
  ): Promise<void> {
    if (!user.phone) return;
    const failed = '결제에 실패했습니다. 앱에서 재결제가 필요합니다.';
    const minutes = ride.endedAt.diff(ride.startedAt, 'minutes');
    const price = await getPrice(ride.branch, minutes);
    const payment = await this.tryPayment(user, ride, price);
    const diff = ride.endedAt.diff(ride.startedAt, 'minutes');
    const startedAt = ride.startedAt.format('YYYY년 MM월 DD일 HH시 mm분');
    const endedAt = ride.endedAt.format('HH시 mm분');
    const usedAt = `${startedAt} ~ ${endedAt}(${diff}분)`;
    const userCol = firestore.collection('users');
    const userDoc = userCol.doc(user.uid);
    const cardName = payment ? payment.cardName : failed;
    const priceStr = `${price.toLocaleString()}원`;
    const maxHours = '관리자가 지정한 ';
    const props = { user, ride, usedAt, maxHours, priceStr, cardName };
    user.username = user.username || '고객';
    const rideCol = firestore.collection('ride');

    await Promise.all([
      userDoc.update({
        curr_ride: null,
        currcoupon: null,
      }),
      rideCol.doc(ride.rideId).update({
        cost: payment ? price : 0,
        payment: payment && payment.merchantUid,
        end_time: ride.endedAt.toDate(),
      }),
      userDoc.collection('ride').add({
        branch: ride.branch,
        end_time: ride.endedAt.toDate(),
        ref: `ride/${ride.rideId}`,
        start_time: ride.startedAt.toDate(),
        unpaied: !payment,
      }),
      send(
        user.phone,
        'TE_2511',
        `킥보드(${ride.kickboardName})가 자동으로 이용 종료되었습니다.`,
        props
      ),
    ]);
  }

  public static async getKickboardCodeById(
    kickboardId: string
  ): Promise<string | null> {
    const kickCol = firestore.collection('kick');
    const kickboard = await kickCol.doc(kickboardId).get();
    const data = kickboard.data();
    return data && data.code;
  }

  public static async stopKickboard(ride: RideDetail): Promise<void> {
    const kickCol = firestore.collection('kick');
    await kickCol.doc(ride.kickboardId).update({ can_ride: true });
    const kickboardDoc = (await kickCol.doc(ride.kickboardId).get()).data();
    if (!kickboardDoc) {
      throw Error(
        `${ride.kickboardId} 킥보드를 찾지 못해 종료하지 못했습니다.`
      );
    }

    const kickboard = await Kickboard.getKickboardIdByCode(
      kickboardDoc.code
    ).catch(() => null);
    if (!kickboard) {
      throw Error('킥보드의 정보를 받아올 수 없어 종료할 수 없습니다');
    }

    try {
      await kickboard.stop();
    } catch (err: any) {
      throw Error(err.message);
    }
  }

  public static async tryPayment(
    user: User,
    ride: RideDetail,
    price: number
  ): Promise<{ merchantUid: string; cardName: string } | null> {
    if (!user.billingKeys || !user.phone) return null;
    try {
      const merchantUid = `${Date.now()}`;
      for (const billingKey of user.billingKeys) {
        const res = await iamport.subscribe.again({
          customer_uid: billingKey,
          merchant_uid: merchantUid,
          amount: price,
          name: ride.branch,
          buyer_name: user.username,
          buyer_tel: user.phone,
        });

        if (res.status === 'paid') {
          logger.info(`결제에 성공하였습니다. ${billingKey}`);
          return {
            merchantUid,
            cardName: `${res.card_number} (${res.card_name})`,
          };
        }

        logger.info(`결제 실패, ${res.fail_reason}`);
        await sleep(3000);
      }
    } catch (err: any) {
      logger.error('결제 오류가 발생하였습니다. ' + err.name);
      logger.error(err.stack);
    }

    return null;
  }

  public static async getRideById(rideId: string): Promise<Ride | null> {
    const rideCol = firestore.collection('ride');
    const ride = await rideCol.doc(rideId).get();
    const data = ride.data();
    if (!data) return null;

    return {
      rideId: ride.id,
      userId: data.uid,
      branch: data.branch,
      cost: data.cost,
      coupon: data.coupon,
      kickboardName: data.kick,
      kickboardId: data.kickName,
      payment: data.payment,
      startedAt: dayjs(data.start_time._seconds * 1000),
      endedAt: data.end_time ? dayjs(data.end_time._seconds * 1000) : dayjs(),
    };
  }

  public static async deleteRide(ride: RideDetail, user: User): Promise<void> {
    const userCol = firestore.collection('users');
    console.log(user.currentRide, ride.rideId);
    if (user.currentRide === ride.rideId) {
      logger.info(`탑승 중인 라이드입니다. 강제로 종료합니다.`);
      await userCol.doc(user.uid).update({ curr_ride: null, currcoupon: null });
    }

    const ref = `ride/${ride.rideId}`;
    const userRides = await userCol
      .doc(user.uid)
      .collection('ride')
      .where('ref', '==', ref)
      .get();

    let userRideId;
    userRides.forEach((ride: any) => (userRideId = ride.id));
    if (userRideId) {
      logger.info(`이미 결제된 라이드입니다.`);
      await userCol.doc(user.uid).collection('ride').doc(userRideId).delete();
    }

    const rideCol = firestore.collection('ride');
    await rideCol.doc(ride.rideId).delete();
  }

  public static async getRides(user: User): Promise<RideDetail[]> {
    const rides: RideDetail[] = [];
    const rideCol = firestore.collection('ride');
    const inuseRides = await rideCol
      .where('uid', '==', user.uid)
      .where('end_time', '==', null)
      .orderBy('start_time', 'asc')
      .get();

    inuseRides.forEach((ride: any) => {
      const data = ride.data();
      rides.push({
        rideId: ride.id,
        userId: data.uid,
        branch: data.branch,
        cost: data.cost,
        coupon: data.coupon,
        startedAt: dayjs(data.start_time._seconds * 1000),
        endedAt: data.end_time ? dayjs(data.end_time._seconds * 1000) : dayjs(),
        kickboardName: data.kick,
        kickboardId: data.kickName,
        payment: data.payment,
      });
    });

    return rides;
  }

  public static async getPhoneByAuth(user: User): Promise<string | null> {
    try {
      const authUser = await auth.getUser(user.uid);
      if (!authUser.phoneNumber) return null;
      const userCol = firestore.collection('users');
      await userCol.doc(user.uid).update({ phone: authUser.phoneNumber });
      logger.info(
        `${user.username}님의 전화번호를 인증 서버로부터 가져왔습니다.`
      );

      return authUser.phoneNumber;
    } catch (err: any) {
      logger.error(err.message);
      logger.info(err.stack);
      return null;
    }
  }
}
