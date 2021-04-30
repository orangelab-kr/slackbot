import dayjs, { Dayjs } from 'dayjs';
import { getPrice, logger } from '../tools';

import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIAL || '{}')
  ),
});

const firestore = admin.firestore();
const rideCol = firestore.collection('ride');
const userCol = firestore.collection('users');

export interface User {
  uid: string;
  username: string;
  phone: string;
  birthday: Dayjs;
  billingKeys: string[];
}

export interface Ride {
  rideId: string;
  branch: string;
  startedAt: Dayjs;
  endedAt: Dayjs;
  unpaied: boolean;
  repayTime: Dayjs;
  repayLevel: number;
  ref: string;
}

export interface RideDetails {
  branch: string;
  cost: number;
  coupon: string;
  endedAt: Dayjs;
  kickboardName: string;
  kickboardId: string;
  payment?: string;
  startedAt: Dayjs;
}

export class Paid {
  public static async setPaied(
    user: User,
    ride: Ride,
    merchantUid: string,
    price: number
  ): Promise<void> {
    const rideId = ride.ref.substr(5);
    await rideCol.doc(rideId).update({
      cost: price,
      payment: merchantUid,
      repayLevel: null,
      repayTime: null,
    });

    const userRides = await userCol
      .doc(user.uid)
      .collection('ride')
      .where('ref', '==', ride.ref)
      .get();
    let userRideId;
    userRides.forEach((ride) => (userRideId = ride.id));
    if (userRideId) {
      await userCol
        .doc(user.uid)
        .collection('ride')
        .doc(userRideId)
        .update({ unpaied: false, repayLevel: null, repayTime: null });
    }
  }

  public static async getUserByPhone(phone: string): Promise<User | null> {
    let user = null;
    const users = await userCol.where('phone', '==', phone).limit(1).get();
    users.forEach((userDoc) => {
      const userData = userDoc.data();
      user = {
        uid: userDoc.id,
        username: userData.name,
        phone: userData.phone,
        birthday: dayjs(userData.birth._seconds * 1000),
        billingKeys: userData.billkey,
      };
    });

    return user;
  }

  public static async getUserRides(uid: string): Promise<Ride[]> {
    const rides: Ride[] = [];
    const rideDocs = await userCol
      .doc(uid)
      .collection('ride')
      .where('unpaied', '==', true)
      .orderBy('end_time', 'desc')
      .limit(1)
      .get();

    rideDocs.forEach((ride) => {
      const data = ride.data();
      rides.push({
        rideId: data.ref.substr(5),
        branch: data.branch,
        startedAt: dayjs(data.start_time._seconds * 1000),
        endedAt: dayjs(data.end_time._seconds * 1000),
        unpaied: data.unpaied,
        repayTime: dayjs(data.repayTime ? data.repayTime._seconds * 1000 : 0),
        repayLevel: data.repayLevel || 0,
        ref: data.ref,
      });
    });

    return rides;
  }

  public static async setPaiedByPhone(
    phone: string
  ): Promise<{ user: User | null; rides: Ride[] }> {
    const user = await this.getUserByPhone(phone);
    if (!user) return { user, rides: [] };

    const rides = await this.getUserRides(user.uid);
    if (rides.length <= 0) return { user, rides };

    for (const ride of rides) {
      const diff = ride.endedAt.diff(ride.startedAt, 'minutes');
      const price = await getPrice(ride.branch, diff);
      try {
        await this.setPaied(user, ride, `${Date.now()}`, price);
      } catch (err) {
        logger.error(err.message);
        logger.info(err.stack);
      }
    }

    return { user, rides };
  }
}
