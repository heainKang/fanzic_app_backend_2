import express from 'express';
import dotenv from "dotenv";
dotenv.config();

// DB
import "reflect-metadata";
import { AppDataSource } from '../models/data-source.js';
import { In } from 'typeorm';
import { Gate } from "../models/gate.js";
import { Fan } from "../models/fan.js";
import { fanGroupMapping } from "../models/fan_group_mapping.js";
import { House } from "../models/house.js";
import { Group } from '../models/group.js';
import { ModelType } from "../models/model_type.js";
import { reservationSchedule } from '../models/reservation_schedule.js';

// Utils
import { Gateway, GatewayManager } from '../realGatewayManager.js';
import { sleep } from '../utils/sleep.js';
import { createFan } from '../repositories/fan.repository.js';
import { createGroup } from '../repositories/group.repository.js';
import { mappingFanGroup } from "../repositories/group.repository.js";
import { getRpm } from '../repositories/fanControl.repository.js';
import { fanOnOff } from '../repositories/fanControl.repository.js';
import { getAllFanStatusInGateway } from './fanControl.repository.js';
import { cancelFanSchedule } from '../utils/schedule.js';
import { cancelGroupSchedule } from '../utils/schedule.js';
import { listGroupSchedules } from '../utils/schedule.js';
import { listFanSchedules } from '../utils/schedule.js';
import { createFanSchedule } from '../repositories/fanControl.repository.js';
import { createGroupSchedule } from '../repositories/group.repository.js';
import { getWeeklyCron } from '../utils/cron_date.js';
import { getNextWeekdayDate } from '../utils/cron_date.js';
import { fanSchedule } from '../utils/schedule.js';
import { groupSchedule } from '../utils/schedule.js';

// import { getUnitCountInGateway } from './gate.repository.js';
import { SimpleConsoleLogger } from "typeorm";
import { dir, group, time } from "console";
import client from '../mqtt_client_CF.js';
import { setFlagsFromString } from 'v8';
import { lstat } from 'fs';


const MQTT_CMD_TYPE = ["sta", "unit", "all", "cnt"]; //sta:상태얻어오기, unit:개별제어, all:전체제어, cnt:unit count
const gatewayManager = new GatewayManager();
const gateway = new Gateway();

const app = express();
app.use(express.json());


// IoT 디바이스가 연결되었을 때 메시지 수신
// function messageHandler(topic, message) {
//     let connectedClientMsg = message.toString();
//     console.log(`messageHandler:${topic}..${connectedClientMsg}`);
//     //saveFanStatus(topic, connectedClientMsg);
// }

// // 리스너 등록
// client.on('message', messageHandler);

const gateRepository = AppDataSource.getRepository(Gate);
const fanRepository = AppDataSource.getRepository(Fan);
const houseRepository = AppDataSource.getRepository(House);
const groupRepository = AppDataSource.getRepository(Group);
const fanGroupMappingRepository = AppDataSource.getRepository(fanGroupMapping);
const modelTypeRepository = AppDataSource.getRepository(ModelType);
const reservationScheduleRepository = AppDataSource.getRepository(reservationSchedule);

// 통합제어 조회
// export async function getMainControl(house_id) {
//     try {
//         // 하우스 조회
//         const house = await houseRepository.findOne({ where: {id: house_id, deleted_flag: 0} });
        
//         // 게이트들 조회
//         const gates = await gateRepository.find({where: {house_id: house_id, deleted_flag: 0}});
//         //console.log("gates=", gates);

//         // 그룹 내 팬 아이디 조회
//         const mappings = await fanGroupMappingRepository.find({where: {house_id: house_id}});
//         const mappedFanIds = new Set(mappings.map(m => m.fan_id));

//         //console.log("mappedFanIds = ", mappedFanIds);


//         const gateList = []
//         for (const gate of gates) {
//             const fanList = []
//             const macAddr = gate.mac_adr;
//             // const macAddr = "1C:69:20:CE:F4:BC";
            
//             //console.log("gate = ", gate);
//             const fanCount = gate.fan_count ?? null;
//             // const fanCount = 20;
//             const resAllFanList = await getAllFanStatusInGateway(macAddr, fanCount);
            
            

//             if(resAllFanList === null) {
//                 //console.log("resAllFanList는 뭘까? == ", resAllFanList);
//                 const fans = await fanRepository.find({where: {gate_id: gate.id}});

//                 for (const fan of fans) {
//                     const mapping_group = await fanGroupMappingRepository.findOne({where: {fan_id: fan.id}});
//                     const fanModelType = await modelTypeRepository.findOne({where: {id:fan.model_type}});
//                     const fanData = {
//                         fan_id: fan.id,
//                         fan_name: fan.name,
//                         fan_code: fan.fan_id,
//                         gate_id: gate.id,
//                         gate_name: gate.name,
//                         fan_speed: fan.speed_level,
//                         fan_status: "Er1",
//                         fan_model_name: fanModelType.name ?? null,
//                         fan_model_SPDHi: fanModelType.SPDHi ?? null,
//                         group_id: mapping_group?.group_id ?? null
//                     }
//                     fanList.push(fanData);             
//                 }              
//             } else {
//                 for (const resFan of resAllFanList.message) {
//                     const fan = await fanRepository.findOne({where: {gate_id: gate.id, fan_id: resFan.motor_id}});
//                     const mapping_group = await fanGroupMappingRepository.findOne({where: {fan_id: fan.id}});
//                     const fanModelType = await modelTypeRepository.findOne({where: {id:fan.model_type}});
//                     const fanData = {
//                         fan_id: fan.id,
//                         fan_name: fan.name,
//                         fan_code: fan.fan_id,
//                         gate_id: gate.id,
//                         gate_name: gate.name,
//                         fan_speed: fan.speed_level,
//                         fan_status: resFan.status,
//                         fan_model_name: fanModelType.name ?? null,
//                         fan_model_SPDHi: fanModelType.SPDHi ?? null,
//                         group_id: mapping_group?.group_id ?? null
//                     }
//                     fanList.push(fanData);
//                 }
//             }

//             //console.log("fanList = ", fanList);
//             const gateData = {
//                 gate_name: gate.name,
//                 fanlist: fanList
//             }
//             gateList.push(gateData);
//         }       


//         // 전체 팬을 한 번에 모으기
//         const allFans = gateList.flatMap(gate => gate.fanlist);

//         console.log("allFans == ", allFans);

//         // 결과를 담을 배열/맵 초기화
//         const fan_list = [];
//         const groupMap = new Map();

//         // 팬을 분류
//         allFans.forEach(fan => {
//         if (fan.group_id == null) {
//             fan_list.push(fan);
//         } else {
//             // group_id가 있으면 Map에 배열로 모아두기
//             const gid = fan.group_id;
//             if (!groupMap.has(gid)) {
//             groupMap.set(gid, []);
//             }
//             groupMap.get(gid).push(fan);
//         }
//         });

//         const entries = Array.from(groupMap.entries());
//         const group_list = await Promise.all(
//             entries.map(async ([group_id, fan_list]) => {
//               // 그룹 정보 조회
//               const group = await groupRepository.findOne({ where: { id: group_id } });
        
//               return {
//                 group_id:   group.id,
//                 group_name: group.name,
//                 fan_count: fan_list.length,
//                 fan_list,
//               };
//             })
//           );
//         const returnData = {
//             house_id: house.id,
//             house_name: house.name,
//             fan_list: fan_list,
//             group_list: group_list            
//         }

//         return { status: 'success', message: '통합제어 조회 완료', returnData: returnData };

//     } catch(error) {
//         console.log("메인콘트롤 조회 중 에러 = ", error);

//     }

// }



// 통합제어 조회(250604 복사)
export async function getMainControl(house_id) {
    try {

        // 게이트들 조회
        const gates = await gateRepository.find({where: {house_id: house_id, deleted_flag: 0}});

        // 그룹 리스트 만들기
        const groupList = []
        const groups = await groupRepository.find({
            where: { house_id: house_id },
            order: { ordering: "ASC" }        
        });

        for(const group of groups) {
            const mappings = await fanGroupMappingRepository.find({where: {group_id: group.id}});
            const fanCount = await fanGroupMappingRepository.count({where: {group_id: group.id}});

            const fanList = []
            for(const mapping of mappings) {
                const fan = await fanRepository.findOne({where: {id: mapping.fan_id, deleted_flag: 0}});
                const fanModelType = await modelTypeRepository.findOne({where: {id:fan.model_type}});
                const gate = await gateRepository.findOne({where: {id: fan.gate_id, deleted_flag: 0}});
                const fanInfo = {
                    fan_id:  fan.id,
                    fan_name: fan.name,
                    gate_id: gate.id,
                    gate_name: gate.name,
                    fan_code: fan.fan_id,
                    fan_status: fan.fan_status,
                    fan_speed: fan.speed_level,
                    fan_model_name: fanModelType.name ?? null,
                    fan_model_SPDHi: fanModelType.SPDHi ?? null
                }

                fanList.push(fanInfo);
            }

            // console.log("fanlist == ", fanList);
            const groupInfo = {
                group_id: group.id,
                group_name: group.name,
                group_ordering: group.ordering,
                fan_count: fanCount,
                fan_list: fanList
            }

            groupList.push(groupInfo);
        }

        const mappings = await fanGroupMappingRepository.find({where: {house_id: house_id}});
        const mappedFanIds = new Set(mappings.map(m => m.fan_id));
        const fanList = []
        for (const gate of gates) {
            const fans = await fanRepository.find({where: {gate_id: gate.id, deleted_flag: 0}});
            // mappedFanIds에 없는 팬만 걸러내기
            const noGroupFans = fans.filter(fan => !mappedFanIds.has(fan.id));

            for(const fan of noGroupFans) {
                // const getrpm = await getRpm(gate.id, fan.id);
                // const rpmValue = getrpm?.result?.message?.[0]?.rpm ?? null;
                // const connect_signal = rpmValue != null ? 1 : 0;
                const fanModelType = await modelTypeRepository.findOne({where: {id:fan.model_type}});
                fanList.push({
                    fan_id: fan.id,
                    fan_name: fan.name,
                    gate_id: gate.id,
                    gate_name: gate.name,
                    fan_code: fan.fan_id,
                    fan_speed: fan.speed_level,
                    fan_status: fan.fan_status,
                    fan_model_name: fanModelType.name ?? null,
                    fan_model_SPDHi: fanModelType.SPDHi ?? null
                });
            }
        }       

        const returnData = {
            fan_list: fanList,
            group_list: groupList            
        }

        console.log("returnData == ", returnData);

        return { status: 'success', message: '통합제어 조회 완료', returnData: returnData };

    } catch(error) {
        console.log("메인콘트롤 조회 중 에러 = ", error);

}
}

// 통합제어 조회
export async function getAllstatus(house_id) {
    try {
        // 하우스 조회
        const house = await houseRepository.findOne({ where: {id: house_id, deleted_flag: 0} });
        
        // 게이트들 조회
        const gates = await gateRepository.find({where: {house_id: house_id, deleted_flag: 0}});
        //console.log("gates=", gates);

        // 그룹 내 팬 아이디 조회
        const mappings = await fanGroupMappingRepository.find({where: {house_id: house_id}});
        const mappedFanIds = new Set(mappings.map(m => m.fan_id));

        const gateList = []
        for (const gate of gates) {
            const fanList = []
            const macAddr = gate.mac_adr;
            //const macAddr = "1C:69:20:CE:F4:F8"
            // const macAddr = "1C:69:20:CE:F4:BC";
            //console.log("gate = ", gate);
            let fanCount = gate.fan_count ?? null;

            if (fanCount === null) {
                fanCount = await fanRepository.count({where: {gate_id: gate.id}});

                gate.fan_count = fanCount;
                await gateRepository.save(gate);
            }
            const resAllFanList = await getAllFanStatusInGateway(macAddr, fanCount);

            if(resAllFanList === null || resAllFanList.message.length === 0) {
                const fans = await fanRepository.find({where: {gate_id: gate.id}});
              
                for (const fan of fans) {
                    fan.fan_status = 'Er10' // 게이트 연결이 아예 안됐을 때
                    fan.dir = '00'
                    fan.rpm = '000'
                    await fanRepository.save(fan);
                }              
            } else {
                // console.log("resAll == ", resAllFanList.message);
                for (const resFan of resAllFanList.message) {
                    const fan = await fanRepository.findOne({where: {gate_id: gate.id, fan_id: resFan.motor_id}});
                    fan.fan_status = resFan.status;
                    if (resFan.dir == "00") {
                        fan.rotation_direction = 0 // 0: 순방향
                    } else if (resFan.dir == "01") {
                        fan.rotation_direction = 1 // 1: 역방향
                    }
                    fan.rpm = resFan.rpm;
                    
                    await fanRepository.save(fan);
                    // console.log(fan.rotation_direction);
                }
            }

            await sleep();
        }
        
        const result = await getMainControl(house_id);
                
        return result;
        //return { status: 'success', message: '통합제어 조회 완료'};

    } catch(error) {
        console.log("메인콘트롤 조회 중 에러 = ", error);

    }

}

// 팬상태 재조회
export async function retryAllStatus(info, maxAttempts = 3, delayMs = 500) {
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



// 그룹 플레이
export async function groupPlay(reqData) {
    try {
        console.log("reqData = ", reqData);
        // reqData = {
        //     group_id,
        //     isPlaying,
        //     dir
        // }
        
        // 그룹 내 팬들
        const mappings = await fanGroupMappingRepository.find({where: {group_id: reqData.group_id}});

        console.log(mappings);

        // 팬 플레이
        if (mappings.length > 0) {
            console.log("팬들있어")
            for (const mapping of mappings ) {
                const fan = await fanRepository.findOne({where: {id: mapping.fan_id}});
                const modelType = await modelTypeRepository.findOne({where: {id: fan.model_type}});
                console.log(fan);
                const dir = reqData.dir || "00";
    
                const info = {
                    gate_id: fan.gate_id,
                    fan_id: fan.id,
                    isPlaying: reqData.isPlaying,
                    SPDHi: modelType.SPDHi,
                    dir: dir           
                }
    
                await fanOnOff(info);
            }
        }

        return { status: 'success', message: '그룹 플레이 완료' };

    } catch(error) {
        console.log("그룹 플레이 중 에러 = ", error);
    }
}

// 예약 조회
export async function getReservation(house_id) {
    try {
        // 예약리스트 조회
        const reservationList = await reservationScheduleRepository.find({where: {house_id: house_id}});


         // 2) fan_id, group_id 만 추출 (중복 제거)
        const fanIds = [...new Set(
            reservationList
            .map(r => r.fan_id)
            .filter(id => id != null)
        )];
        const groupIds = [...new Set(
            reservationList
            .map(r => r.group_id)
            .filter(id => id != null)
        )];
  
        // 3) 한 번에 fan·group 조회
        const [fans, groups] = await Promise.all([
            fanIds.length
            ? fanRepository.find({ where: { id: In(fanIds) } })
            : [],
            groupIds.length
            ? groupRepository.find({ where: { id: In(groupIds) } })
            : []
        ]);
  
        // 4) 조회 결과를 Map 으로 만들기
        const fanMap = new Map(fans.map(f => [f.id, f]));
        const groupMap = new Map(groups.map(g => [g.id, g]));
  
        // 5) reserveList 조립
        const reserveList = reservationList.reduce((acc, r) => {
            const formattedTime = typeof r.time === 'string'
            ? r.time.substring(0, 5)   // "11:00:00" → "11:00"
            : r.time;                  // 혹시 Date 객체일 경우엔 추가 포맷 필요

            if (fanMap.has(r.fan_id)) {
            const fan = fanMap.get(r.fan_id);
            
            let fan_speed;
            if ( r.speed_level === 1 ) {
            fan_speed = '미풍'
            } else if ( r.speed_level === 2) {
            fan_speed = '약풍'
            } else if ( r.speed_level === 3) {
            fan_speed = '강풍'
            } else if ( r.speed_level === 4) {
            fan_speed = '터보'
            }

            let direction;
            if (r.dir == "00") {
            direction = "순방향" // 0: 순방향
            } else if (r.dir == "01") {
            direction = "역방향" // 1: 역방향
            }
            acc.push({
                reservation_id: r.id,
                kind:          'fan',
                fan_id:        fan.id,
                fan_name:      fan.name,
                days:          r.days,
                one_day:       r.one_day,
                time:          formattedTime,
                isPlaying:     r.isPlaying,
                repeat:        r.repeat,
                active_flag:   r.active_flag,
                speed_level:   fan_speed,
                dir        :   direction
            });
            }
            if (groupMap.has(r.group_id)) {
            const group = groupMap.get(r.group_id);
            let fan_speed;
            if ( r.speed_level === 1 ) {
            fan_speed = '미풍'
            } else if ( r.speed_level === 2) {
            fan_speed = '약풍'
            } else if ( r.speed_level === 3) {
            fan_speed = '강풍'
            } else if ( r.speed_level === 4) {
            fan_speed = '터보'
            }

            let direction;
            if (r.dir == "00") {
            direction = "순방향" // 0: 순방향
            } else if (r.dir == "01") {
            direction = "역방향" // 1: 역방향
            }
            acc.push({
                reservation_id: r.id,
                kind:          'group',
                group_id:      group.id,
                group_name:    group.name,
                days:          r.days,
                one_day:       r.one_day,
                time:          formattedTime,
                isPlaying:     r.isPlaying,
                repeat:        r.repeat,
                active_flag:   r.active_flag,
                speed_level:   fan_speed,
                dir        :   direction
            });
            }
            return acc;
        }, []);

        // const reserveList = []
        // for (const list of reservationList) {
        //     const fan = await fanRepository.findOne({where: {id: list.fan_id}});
        //     const group = await groupRepository.findOne({where: {id: list.group_id}});

        //     if(fan) {
        //         const info = {
        //             reservation_id: list.id,
        //             kind: 'fan',
        //             fan_id: fan.id ?? null,
        //             fan_name: fan.name ?? null,
        //             days: list.days,
        //             time: list.time,
        //             isPlaying: list.isPlaying,
        //             repeat: list.repeat,
        //         }

        //         reserveList.push(info);
        //     }
        
        //     if(group) {
        //         const info = {
        //             reservation_id: list.id,
        //             kind: 'group',
        //             group_id: group.id ?? null,
        //             group_name: group.name ?? null,
        //             days: list.days,
        //             time: list.time,
        //             isPlaying: list.isPlaying,
        //             repeat: list.repeat
        //         }

        //         reserveList.push(info);
        //     }
        // }

        return { status: 'success', message: '그룹 플레이 완료', reserveList };

    } catch(error) {
        console.log("그룹 플레이 중 에러 = ", error);
    }
}

// 팬 예약 켜기 끄기
export async function scheduleOnOff(house_id, reservation_id, kind, active_flag) {
    try {

        console.log("active_flag == ", active_flag);
        
        const reservation = await reservationScheduleRepository.findOne({where: {id: reservation_id, house_id: house_id}});
        if (!reservation) {
            throw new Error(`Reservation not found (id=${reservation_id}, house_id=${house_id})`);
        }
        const house = await houseRepository.findOne({where: {id: house_id}});
        const user_id = house.user_id;

        //  // 재등록을 위한 요청 데이터 구성
        //  const { isPlaying, speed_level, dir, days, time, repeat: repeatRaw } = reservation;
        //  const gate_id = reservation.gate_id;
        //  const fan_id = reservation.fan_id; 
        //  const group_id = reservation.group_id;
        //  const reqData = {
        //      play_req: { isPlaying, speed_level, dir },
        //      date_req: {
        //        days,
        //        time,
        //        repeat: Boolean(Number(repeatRaw))
        //      },
        //      reRegister: true
        //  };


        const { gate_id, fan_id, group_id, isPlaying, speed_level, dir, repeat, days} = reservation
        const [hour, minute] = reservation.time.split(':').map(t => Number(t));

        console.log("hour, minute == ", hour, minute);

        const reqData = {
            play_req : {
                isPlaying : reservation.isPlaying,
                speed_level: reservation.speed_level,
                dir: reservation.dir
            },
            date_req: {
                days: reservation.days,
                time: reservation.time,
                repeat: Boolean(Number(repeat))
            },
            reRegister: true
        }

        
        
        // 2) OFF면 취소, ON이면 생성
        if(active_flag === 'OFF') {
            if(kind === 'fan') {
                cancelFanSchedule(reservation.id);
            } else if(kind === 'group') {
                cancelGroupSchedule(reservation.id);
            }
        } else if(active_flag === 'ON') {
            // let cronExpressions = Boolean(Number(repeat))
            // ? await getWeeklyCron(days, hour, minute)
            // : await getNextWeekdayDate(hour, minute);

            // // 문자열 하나만 반환될 수도 있으니 배열 보장
            // if (!Array.isArray(cronExpressions)) {
            //     cronExpressions = [cronExpressions];
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

            if(kind === 'fan') {
                // 모든 cron 식에 대해 병렬로 스케줄 생성
                const onoffInfo = { gate_id, fan_id, isPlaying, speed_level, dir };
                await Promise.all(
                    // cronExpressions.map(expr => fanSchedule(reservation.id, fan_id, expr, onoffInfo))
                    cronExpressions.map(expr => fanSchedule(house.name, user_id, reservation.id, fan_id, expr, onoffInfo))
                );

            } else if(kind === 'group') {
                // 모든 cron 식에 대해 병렬로 스케줄 생성
                const onoffInfo = { group_id, isPlaying, speed_level, dir };
                await Promise.all(
                    // cronExpressions.map(expr => groupSchedule(reservation.id, group_id, expr, onoffInfo))
                    cronExpressions.map(expr => groupSchedule(house.name, user_id, reservation.id, group_id, expr, onoffInfo))
                );
                //createGroupSchedule(house_id, group_id, reqData);
            }
        }
        reservation.active_flag = active_flag;
        await reservationScheduleRepository.save(reservation);
        return { status: 'success', message: '예약 온오프 완료', reservation: reservation.active_flag };

    } catch(error) {
        console.log("예약 취소 중 에러 = ", error);
        return { status: 'error', message: error.message || '예약 처리 중 오류 발생' };
    }
}

// 예약 삭제
export async function deleteSchedule(house_id, reservation_list) {
    try {

        for(const i of reservation_list) {
            const reservation = await reservationScheduleRepository.findOne({where: {id: i.reservation_id, house_id: house_id}});
            if(i.kind === 'fan') {
                console.log("fan schedule delete");
                await cancelFanSchedule(reservation.id);
            } else if(i.kind === 'group') {
                console.log("group schedule delete");
                await cancelGroupSchedule(reservation.id);
            }

            await reservationScheduleRepository.delete({id: i.reservation_id});
        }

        console.log({ status: 'success', message: '예약 삭제 완료' });
        return { status: 'success', message: '예약 삭제 완료' };

    } catch(error) {
        console.log("예약 삭제 중 에러 = ", error);
    }
}

// schedule 리스트 보기
export async function getSchedule() {
    try {
     
       
        //const list = await listGroupSchedules();
        const list = await listFanSchedules();

        console.log("list == ", list);
        

        return { list };

    } catch(error) {
        console.log("예약 취소 중 에러 = ", error);
    }
}


