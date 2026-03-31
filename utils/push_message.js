import "reflect-metadata";
import { AppDataSource } from '../models/data-source.js';
import { AppDataSource_1 } from '../models/movingFan/data-source_1.js';
import { PushMessage } from '../models/movingFan/push_message.js';
//import { PushMessage } from "/home/siyoo/FanZic-App/db/PushMessage.js";

// const pushMessageRepository = AppDataSource.getRepository(PushMessage);
const pushMessageRepository = AppDataSource_1.getRepository(PushMessage);

// firebase 푸시알림
import serviceAccount from '../firebase_key.json' assert { type: "json" };
import admin from 'firebase-admin';
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
});

// 관리자가 비밀번호 초기화 시 푸시알림
export async function sendPushAlarm(user_id, tokenList, bodyMessage) {
    try {
        // 토큰 값 확인 후 푸시 알림 전송 시도
        if (tokenList.length > 0) {
            try {
                await sendPushNotificationToToken(user_id, tokenList, bodyMessage);
                console.log("푸시 알림을 성공적으로 보냈습니다.");
            } catch (error) {
                handlePushNotificationError(error, tokenList);
                console.log("푸시 알림을 실패했습니다.");
                return error
            }
        } else {
            //deleteInvalidUser(user.token_value);
            console.log("tokenList 유효하지 않음");
        }
    } catch (error) {
        // Sentry.captureException(error);
        console.error("푸시 알림을 보내는 중 에러가 발생했습니다:", error);
    }
}

// 알림 메세지 보내기
async function sendPushNotificationToToken(user_id, tokenList, bodyMessage) {
    console.log("푸시 알림 보내기");
    const now = new Date(); // 현재 시간을 가져옵니다.
    console.log("tokenList == ", tokenList);
    console.log("message start time ::", now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    // const getUserIdSql = 
    //         `SELECT *
    //         FROM User
    //         WHERE token_value = ? and device_type = 'i';`;
    // // Get userId
    // const userIdResult = await db.execute(getUserIdSql, [token]);
    // const userId = userIdResult[0];
    let badgeCount = 0;
    // if (user.device_type == 'i') {
    //     badgeCount = await calculateBadgeCountForUser(user.id);
    //     console.log("BadgeCount = ", badgeCount)
    // }
    // const message = {
    //     "token": token,
    //     "notification": {
    //         "title" : 'FANZIC-ON',
    //         "body" : bodyMessage,
    //     },
    //     android: {
    //         priority: 'high',
    //         notification: {
    //         sound: 'default'
    //         }
    //     },
    //     // apns: {  // iOS 설정 부분
    //     //     payload: {
    //     //         aps: {
    //     //             alert: {
    //     //                 title: '예약 꺼짐 알림입니다.',
    //     //                 body: `${fanName}이(가) 꺼졌습니다`
    //     //             },
    //     //             badge: badgeCount, // 배지 상태를 제어하는 부분
    //     //             sound: 'default'
    //     //         }
    //     //     }
    //     // }
    // }


    const message = {
        "tokens": tokenList,
        "notification": {
            "title" : 'FANZIC-ON',
            "body" : bodyMessage,
        },
        android: {
            priority: 'high',
            notification: {
            sound: 'default'
            }
        },
    }

    await admin.messaging().sendEachForMulticast(message).then((response) => {
        console.log('FCM Response ::', response);
    });

    // await admin.messaging().send(message).then((response) => {
    //     console.log('FCM Response ::', response);
    // });
    // const pushContent = message.notification.body;
    // const newPushMessage = pushMessageRepository.create({ messageContent: pushContent, userId: user_id});
    // //const newPushMessage = pushMessageRepository.create({ message_content: pushContent, user_id: user.id });
    // const savePushMessage = await pushMessageRepository.save(newPushMessage);
    // console.log("저장된 푸시메시지 = ", savePushMessage);

    
    const endTime = new Date(); // 메시지 전송이 완료된 후 시간을 가져옵니다.
    console.log("message end time ::", endTime.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}


// 토큰값에 따른 에러 처리
function handlePushNotificationError(error, token) {
    console.log(error.code)
    if (error.code === 'messaging/registration-token-not-registered') {
        console.log("등록되지 않은 토큰입니다. ::", token);
        // deleteInvalidUser(token);
        console.log("User has been deleted.");
    } else if(error.code === 'messaging/mismatched-credential') {
        // deleteInvalidUser(token);
        console.log("FCM 발신자가 다릅니다. ::", token);
    } else if(error.code ==='messaging/third-party-auth-error') {
        // deleteInvalidUser(token);
        console.log("외부테스터입니다. ::", token);
    } else if(error.code=== 'messaging/invalid-argument') {
        console.log("로그아웃 했던 죽은 토큰 ::", token);
        deleteInvalidUser(token);
    }  else {
        console.error("푸시 알림을 보내는 중 에러가 발생했습니다. ::", error);
    }
}