import schedule from 'node-schedule';
import cron from 'node-cron';
import { fanOnOff } from '../repositories/fanControl.repository.js';
import { groupOnOff } from '../repositories/group.repository.js';
import { deleteSchedule, groupPlay } from '../repositories/mainControl.repository.js';
import "reflect-metadata";
import { AppDataSource } from '../models/data-source.js';
import { AppDataSource_1 } from '../models/movingFan/data-source_1.js';
import { reservationSchedule } from '../models/reservation_schedule.js';
import { Fan } from '../models/fan.js';
import { Group } from '../models/group.js';
import { PushMessage } from '../models/movingFan/push_message.js';
import { User } from '../models/movingFan/user.js';
import { sendPushAlarm } from './push_message.js';
import { UserTokenMapping } from '../models/movingFan/user_token_mapping.js';
import { addYears } from 'date-fns';

const reservationScheduleRepository = AppDataSource.getRepository(reservationSchedule);
const pushMessageRepository = AppDataSource_1.getRepository(PushMessage);
const userRepository = AppDataSource_1.getRepository(User);
const fanRepository = AppDataSource.getRepository(Fan);
const groupRepository = AppDataSource.getRepository(Group);
const userTokenMappingRepository = AppDataSource_1.getRepository(UserTokenMapping);

// '0 14 * * 1,3'은 cron 형식입니다.
// 0 → 0분
// 14 → 14시 (오후 2시)
// * → 매일
// * → 매월
// 1,3 → 월요일(1), 수요일(3)

// 매주 월요일과 수요일 오후 2시에 실행되는 작업 스케줄링
// const j = schedule.scheduleJob('0 0 14 * * 1,3', function () {
//     console.log('작업 실행됨: 매주 월/수 오후 2시');
// });


// 팬 잡 레지스트리 생성
const fanJobs = new Map();

// 팬 예약 등록
export async function fanSchedule(house_name, user_id, reservation_id, fan_id, cronExpr, onoffInfo) {
  // fan_id 키가 없으면 배열로 초기화
  if (!fanJobs.has(reservation_id)) {
    fanJobs.set(reservation_id, []);
  }  
  const { isPlaying, speed_level, dir } = onoffInfo;
  const job = schedule.scheduleJob({ rule: cronExpr, tz: 'Asia/Seoul' }, 
    async () => {
      try {
        console.log(`[요청] [${cronExpr}] fanOnOff 예약 실행 (${fan_id})`);

        let bodyMessage = ``;
        const fan = await fanRepository.findOne({where: {id: fan_id}});

        // [예약] (거실)의 팬(팬01) 켜짐 [풍속 : 미풍, 방향 : 역방향]
        let fan_speed;
        if ( speed_level === 1 ) {
          fan_speed = '미풍'
        } else if ( speed_level === 2) {
          fan_speed = '약풍'
        } else if ( speed_level === 3) {
          fan_speed = '강풍'
        } else if ( speed_level === 4) {
          fan_speed = '터보'
        }

        let direction;
        if (dir == "00") {
          direction = "순방향" // 0: 순방향
        } else if (dir == "01") {
          direction = "역방향" // 1: 역방향
        }

        if (isPlaying == 'ON') {
          bodyMessage = `[예약] (${house_name})의 팬(${fan.name}) 켜짐 [풍속 : ${fan_speed}, 방향 : ${direction}]`
        } else if(isPlaying == 'OFF') {
          bodyMessage = `[예약] (${house_name})의 팬(${fan.name}) 꺼짐`
        }
        
        // await fanOnOff(onoffInfo);

        // ✅ 재시도 포함된 fanOnOff
        const ok = await retryFanOnOff(onoffInfo);

        console.log("ok == ", ok);
        if (!ok) {
          console.error('[fanOnOff] 5회 재시도 후에도 실패 예약 작업 중단');
          bodyMessage = `[예약] (${house_name})의 팬(${fan.name}) 연결 오류`
        }

        console.log('fanOnOff 시도 완료');
        
        // 무반복 확인 후 스케쥴 삭제
        const result = await endNoRepeatSchedule(reservation_id);

        const tokenMapping = await userTokenMappingRepository.find({where: {user_id: user_id}});
        // const tokenList = tokenMapping.map(({ token_value }) => token_value);

        const tokenList = tokenMapping
        .filter(({ alarm_flag }) => alarm_flag === 1)
        .map(({ token_value }) => token_value);
        await sendPushAlarm(user_id, tokenList, bodyMessage);
     
        const pushContent = bodyMessage;
        const newPushMessage = pushMessageRepository.create({ messageContent: pushContent, userId: user_id});
        //const newPushMessage = pushMessageRepository.create({ message_content: pushContent, user_id: user.id });
        const savePushMessage = await pushMessageRepository.save(newPushMessage);
        console.log("저장된 푸시메시지 = ", savePushMessage);

        console.log("푸시 알림 완료");


        // console.log(result);
      } catch (error) {
        console.error('Failed to reservation', error);
      }
    }
  );    

  // 배열에 새 job 추가
  fanJobs.get(reservation_id).push({ fan_id, cronExpr, isPlaying, job });
  ////////////////////
  console.log(`[schedule] 예약 생성됨 - ${cronExpr}`);
  
  // fanJobs.set(fan_id, job);
  // 배열에 push
  
  // 현재 예약 확인
  // console.log(listFanSchedules());
  
  return job;
}


export async function retryFanOnOff(info, maxAttempts = 2, delayMs = 100) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await fanOnOff(info);           // 성공하면 그대로 종료
      return true;
    } catch (err) {
      console.error(`[fanOnOff] 실패 ${i}/${maxAttempts}`, err);
      // 최대 횟수 초과면 false 반환
      if (i === maxAttempts) return false;

      // 다음 시도 전 잠깐 대기(0.5초; 필요 없으면 0으로)
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

export async function retryFanOnOffofGroup(info, maxAttempts = 1, delayMs = 50) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await fanOnOff(info);           // 성공하면 그대로 종료
      return true;
    } catch (err) {
      console.error(`[fanOnOff] 실패 ${i}/${maxAttempts}`, err);
      // 최대 횟수 초과면 false 반환
      if (i === maxAttempts) return false;

      // 다음 시도 전 잠깐 대기(0.5초; 필요 없으면 0으로)
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// 팬 전체 예약 목록 조회
export function listFanSchedules() {
  const scheduleList = [];

  // fanJobs: Map<fan_id, Array<{ cronExpr, job }>>
  for (const [reserveId, entries] of fanJobs.entries()) {
    entries.forEach(({ fan_id, cronExpr, isPlaying, job }) => {
      scheduleList.push({
        reserve_id:   reserveId,
        cronExpr:     cronExpr,
        fan_id: fan_id,
        isPlaying: isPlaying
      });
    });
  }

  return scheduleList;
}

// 팬 예약 취소
export function cancelFanSchedule(reserve_id) {
  const stored = fanJobs.get(reserve_id);

  // 없거나 빈 리스트일 때
  if (!stored) {
    console.warn(`취소할 팬예약이 없습니다: ${reserve_id}`);
    return false;
  }

  // Map에 저장된 값이 배열인지, 단일 Job인지 판별
  const jobs = Array.isArray(stored)
    ? stored               // [{ cronExpr, job }, ...]
    : [ { job: stored } ]; // 단일 Job 객체

  // 각 스케줄Job 인스턴스에 cancel() 호출
  jobs.forEach(item => {
    const schedJob = item.job;
    if (schedJob && typeof schedJob.cancel === 'function') {
      console.log(`→ cancelling job (${item.cronExpr || schedJob.name || 'unknown'})`);
      schedJob.cancel();
    } else {
      // 만약 name 기반으로 취소하고 싶다면
      if (schedJob && schedJob.name) {
        schedule.cancelJob(schedJob.name);
        console.log(`→ cancelled by name: ${schedJob.name}`);
      } else {
        console.warn('→ 취소 가능한 Job 인스턴스가 아닙니다', schedJob);
      }
    }
  });

  // Map에서 제거
  fanJobs.delete(reserve_id);
  console.log(`[schedule] 팬 예약 모두 취소됨 (${reserve_id})`);

  // 현재 예약 확인
  console.log(`[schedule] 남은 팬 예약`, listFanSchedules());

  return true;
}


// 그룹 잡 레지스트리 생성
const groupJobs = new Map();

// 그룹 예약 등록
export async function groupSchedule(house_name, user_id, reservation_id, group_id, cronExpr, onoffInfo) {
  // const onoffInfo = { group_id, isPlaying, dir, speed_level }; 
  // 배열 초기화
   if (!groupJobs.has(reservation_id)) {
    groupJobs.set(reservation_id, []);
  }

  // 그룹플레이 시 넘기는 매개변수
  const { isPlaying, speed_level, dir } = onoffInfo;
  const job = schedule.scheduleJob({rule: cronExpr, tz: 'Asia/Seoul' },
    async () => {
      try {
        console.log(`[요청] [${cronExpr}] groupOnOff 예약 실행`);

        // 그룹 플레이
        let groupPlayInfo;
        groupPlayInfo = {
          group_id: group_id,
          isPlaying: isPlaying,
          dir: dir,
          speed_level: speed_level,
          house_name: house_name,
          user_id: user_id,
          isReserve: true
        }

        await groupOnOff(groupPlayInfo);
        console.log('groupOnOff 성공');

        // 무반복 확인 후 스케쥴 삭제
        const result = await endNoRepeatSchedule(reservation_id);
        // console.log(result);

         // [예약] (거실)의 팬(팬01) 켜짐 [풍속 : 미풍, 방향 : 역방향]
         let fan_speed;
         if ( speed_level === 1 ) {
           fan_speed = '미풍'
         } else if ( speed_level === 2) {
           fan_speed = '약풍'
         } else if ( speed_level === 3) {
           fan_speed = '강풍'
         } else if ( speed_level === 4) {
           fan_speed = '터보'
         }
 
         let direction;
         if (dir == "00") {
           direction = "순방향" // 0: 순방향
         } else if (dir == "01") {
           direction = "역방향" // 1: 역방향
         }

        // 푸시 알림
        // 바디 메세지 작성
        let bodyMessage = ``;
        const group = await groupRepository.findOne({where: {id: group_id}});
        if (isPlaying == 'ON') {
          bodyMessage = `[예약] (${house_name})의 그룹(${group.name}) 켜짐  [풍속 : ${fan_speed}, 방향 : ${direction}]`
        } else {
          bodyMessage = `[예약] (${house_name})의 그룹(${group.name}) 꺼짐`
        }

        const tokenMapping = await userTokenMappingRepository.find({where: {user_id: user_id}});
        //const tokenList = tokenMapping.map(({ token_value }) => token_value);
        
        const tokenList = tokenMapping
        .filter(({ alarm_flag }) => alarm_flag === 1)
        .map(({ token_value }) => token_value);

        await sendPushAlarm(user_id, tokenList, bodyMessage);

        const pushContent = bodyMessage;
        const newPushMessage = pushMessageRepository.create({ messageContent: pushContent, userId: user_id});
        //const newPushMessage = pushMessageRepository.create({ message_content: pushContent, user_id: user.id });
        const savePushMessage = await pushMessageRepository.save(newPushMessage);
        console.log("저장된 푸시메시지 = ", savePushMessage);
     
        console.log("푸시 알림 완료");
        
      } catch (error) {
        console.error('Failed to reservation', error);
      }
    }
  );

  // 배열에 새 job 추가
  groupJobs.get(reservation_id).push({ group_id, cronExpr, isPlaying, job });
  ////////////////////
  console.log(`[schedule] 예약 생성됨 - ${cronExpr}`);
 
  // 현재 예약 확인
  // console.log(listGroupSchedules());

  return job;
}


// 그룹 전체 예약 목록 조회
export function listGroupSchedules() {
  const scheduleList = [];

  // fanJobs: Map<fan_id, Array<{ cronExpr, job }>>
  for (const [reserveId, entries] of groupJobs.entries()) {
    entries.forEach(({ group_id, cronExpr, isPlaying, job }) => {
      scheduleList.push({
        reserve_id:   reserveId,
        cronExpr:     cronExpr,
        group_id:     group_id,
        isPlaying: isPlaying
      });
    });
  }

  return scheduleList;
}

// 그룹 예약 취소하기
export function cancelGroupSchedule(reserve_id) {
  const stored = groupJobs.get(reserve_id);

  // 없거나 빈 리스트일 때
  if (!stored) {
    console.warn(`취소할 그룹예약이 없습니다: ${reserve_id}`);
    return false;
  }

  // Map에 저장된 값이 배열인지, 단일 Job인지 판별
  const jobs = Array.isArray(stored)
    ? stored               // [{ cronExpr, job }, ...]
    : [ { job: stored } ]; // 단일 Job 객체

  // 각 스케줄Job 인스턴스에 cancel() 호출
  jobs.forEach(item => {
    const schedJob = item.job;
    if (schedJob && typeof schedJob.cancel === 'function') {
      console.log(`→ cancelling job (${item.cronExpr || schedJob.name || 'unknown'})`);
      schedJob.cancel();
    } else {
      // 만약 name 기반으로 취소하고 싶다면
      if (schedJob && schedJob.name) {
        schedule.cancelJob(schedJob.name);
        console.log(`→ cancelled by name: ${schedJob.name}`);
      } else {
        console.warn('→ 취소 가능한 Job 인스턴스가 아닙니다', schedJob);
      }
    }
  });

  // Map에서 제거
  groupJobs.delete(reserve_id);
  console.log(`[schedule] 그룹 예약 모두 취소됨 (${reserve_id})`);

  // 현재 예약 확인
  console.log(`[schedule] 남은 그룹 예약`, listGroupSchedules());

  return true;
}


// 반복없는 예약이라면 삭제
export async function endNoRepeatSchedule(reserve_id) {
  const reserveSchedule = await reservationScheduleRepository.findOne({where: {id: reserve_id}});
  
  if (reserveSchedule.repeat === 0 || reserveSchedule.repeat === '0') {
    console.log('반복없는 예약 삭제');
    let reservation_list = [{reservation_id: reserve_id}];
    await deleteSchedule(reserveSchedule.house_id, reservation_list);
    return 'schedule end';
  } else {
    return 'continue';
  }
}


// 푸시메시지 
export async function pushAalrm(user_id, bodyMessage) {
  try {
      // 1. 토큰 매핑 조회
      const tokenMapping = await userTokenMappingRepository.find({where: {user_id: user_id}});
      if (!tokenMapping || tokenMapping.length === 0) {
          console.warn(`[pushAalrm] user(${user_id})의 토큰 매핑이 없습니다.`);
          return; // 토큰 없는 경우 조용히 리턴하거나 필요에 따라 처리
      }

      const tokenList = tokenMapping
      .filter(({ alarm_flag }) => alarm_flag === 1)
      .map(({ token_value }) => token_value);

      if(tokenList.length === 0) {
          console.warn(`[pushAalrm] user(${user_id})의 유효 알람 토큰이 없습니다.`);
          // 필요하다면 여기서도 리턴
          return;
      }

      // 2. 푸시 전송 시도
      try {
          await sendPushAlarm(user_id, tokenList, bodyMessage);
      } catch (pushError) {
          console.error(`[pushAalrm] sendPushAlarm 실패 user: ${user_id}`, pushError);
          // 필요시 에러 throw 혹은 리턴
          throw pushError;
      }

      // 3. 푸시 메시지 저장
      try {
          const pushContent = bodyMessage;
          const newPushMessage = pushMessageRepository.create({ messageContent: pushContent, userId: user_id});
          const savePushMessage = await pushMessageRepository.save(newPushMessage);
          console.log("저장된 푸시메시지 = ", savePushMessage);
      } catch (saveError) {
          console.error(`[pushAalrm] 푸시메시지 저장 실패 user: ${user_id}`, saveError);
          // 저장 실패 시, 푸시 알림은 이미 발송된 상태이므로, 필수 저장이 아니라면 여기서 마무리
      }

    console.log("푸시 알림 완료");
  } catch (err) {
    console.error(`[pushAalrm] 함수 전체 오류 발생 user: ${user_id}`, err);
    // 필요시 rethrow, 혹은 사용자에 따라 에러 처리 방식 조정
  }

}