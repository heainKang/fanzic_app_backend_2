import "reflect-metadata";
import { AppDataSource } from "../models/data-source.js";
import { reservationSchedule } from '../models/reservation_schedule.js';
// import { Fan } from "./models/fan.js";
// import { Group } from "./models/group.js";
// import { fanGroupMapping } from "./models/fan_group_mapping.js";

// utils
import { createFanSchedule } from "../repositories/fanControl.repository.js";
import { createGroupSchedule } from "../repositories/group.repository.js";
import { getNextWeekdayDate } from '../utils/cron_date.js';
import { getWeeklyCron } from '../utils/cron_date.js';
import { fanSchedule } from "./schedule.js";
import { groupSchedule } from "./schedule.js";
import { House } from "../models/house.js";

// const fanRepository = AppDataSource.getRepository(Fan);
// const fanGroupMappingRepository = AppDataSource.getRepository(fanGroupMapping);
const reservationScheduleRepository = AppDataSource.getRepository(reservationSchedule);
const houseRepository = AppDataSource.getRepository(House);

export async function uploadSchedule () {
  //const schedules = await reservationScheduleRepository.find();
    const schedules = await reservationScheduleRepository.find();
    for (const schedule of schedules) {
        // reqData = {
        //     play_req = {
        //      isPlaying,
        //      speed_level,
        //      dir
        //     },
        //     date_req = {
        //      days : [0, 1, 3]
        //      time : 2:00
        //      repeat : true, false
        //     }
        // }
        // const house_id = schedule.house_id;
        // const gate_id = schedule.gate_id; 
        // const fan_id = schedule.fan_id;
        // const group_id = schedule.group_id;
        // const active_flag = schedule.active_flag;
        // const repeat = Boolean(Number(schedule.repeat));
        // const days = schedule.days

        const { house_id, gate_id, fan_id, group_id, isPlaying, speed_level, dir, active_flag, repeat, days} = schedule

        const [hour, minute] = schedule.time.split(':').map(t => Number(t));

        // console.log("hour, minute == ", hour, minute);

        const reqData = {
            play_req : {
                isPlaying : schedule.isPlaying,
                speed_level: schedule.speed_level,
                dir: schedule.dir
            },
            date_req: {
                days: schedule.days,
                time: schedule.time,
                repeat: Boolean(Number(repeat))
            },
            reRegister: true
        }

        const onoffInfo = { gate_id, fan_id, isPlaying, speed_level, dir };
        const house = await houseRepository.findOne({where: {id: house_id}});
        const user_id = house.user_id;

        if(fan_id && active_flag === 'ON') {
            // let cronExpressions = Boolean(Number(repeat))
            // ? await getWeeklyCron(days, hour, minute)
            // : await getNextWeekdayDate(hour, minute);
            // let cronExpressions;
            // console.log("repaeat ==", repeat);
            // if(Number(repeat) === 1) {
            //     cronExpressions = await getWeeklyCron(days, hour, minute)
            // } else if(!Number(repeat)) {
            //     console.log("여기 안들어와?")
            //     cronExpressions = (await getNextWeekdayDate(hour, minute)).cron;
            //     console.log("efef == ", cronExpressions);
            // }

            const raw = await (Number(repeat)            // repeat가 1‑truthy → 매주
            ? getWeeklyCron(days, hour, minute)        // 예) '0 9 * * 1,3'
            : getNextWeekdayDate(hour, minute)         // 예) { cron: '0 9 09 07 *' }
            );

            let cronExpressions = raw?.cron ?? raw; 
            // 문자열 하나만 반환될 수도 있으니 배열 보장
            if (!Array.isArray(cronExpressions)) {
                cronExpressions = [cronExpressions];
            }

            // 모든 cron 식에 대해 병렬로 스케줄 생성
            await Promise.all(
                cronExpressions.map(expr => fanSchedule(house.name, user_id, schedule.id, fan_id, expr, onoffInfo))
            );

            // createFanSchedule(house_id, gate_id, fan_id, reqData);
        } else if(group_id && active_flag === 'ON') { 
            // let cronExpressions = Boolean(Number(repeat))
            // ? weeklyCron = await getWeeklyCron(days, hour, minute)
            // : dayCron= await getNextWeekdayDate(hour, minute).cron;


            // 1) 공통된 결과 객체 얻기
            // const raw = await (Number(repeat)            // repeat가 1‑truthy → 매주
            // ? getWeeklyCron(days, hour, minute)        // 예) '0 9 * * 1,3'
            // : getNextWeekdayDate(hour, minute)         // 예) { cron: '0 9 09 07 *' }
            // );

            const raw = await (Number(repeat)            // repeat가 1‑truthy → 매주
            ? getWeeklyCron(days, hour, minute)        // 예) '0 9 * * 1,3'
            : getNextWeekdayDate(hour, minute)         // 예) { cron: '0 9 09 07 *' }
            );

            let cronExpressions = raw?.cron ?? raw; 
    
            // console.log("cron = ", cronExpressions);
            // 문자열 하나만 반환될 수도 있으니 배열 보장
            if (!Array.isArray(cronExpressions)) {
                cronExpressions = [cronExpressions];
            }

            // 모든 cron 식에 대해 병렬로 스케줄 생성
            await Promise.all(
                cronExpressions.map(expr => groupSchedule(house.name, user_id, schedule.id, group_id, expr, onoffInfo))
            );

            //createGroupSchedule(house_id, group_id, reqData);
        }
    }
}
