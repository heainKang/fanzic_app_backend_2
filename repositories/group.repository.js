// DB
import "reflect-metadata";
import { AppDataSource_1} from '../models/movingFan/data-source_1.js';
import { User } from "../models/movingFan/user.js";
//import { AppDataSource as AppDataSource_1} from '/home/siyoo/FanZic-App/db/data-source.js';
import { AppDataSource } from '../models/data-source.js';
import { Gate } from "../models/gate.js";
import { Fan } from "../models/fan.js";
import { House } from "../models/house.js";
import { Group } from "../models/group.js";
import { fanGroupMapping } from "../models/fan_group_mapping.js";
import { reservationSchedule } from '../models/reservation_schedule.js';
import { UserTokenMapping } from '../models/movingFan/user_token_mapping.js';

//import { User } from '/home/siyoo/FanZic-App/db/User.js';
import { Not } from 'typeorm';

// Utils
import { fanOnOff } from "./fanControl.repository.js";
import { speedControl } from "./fanControl.repository.js";
import { ModelType } from '../models/model_type.js';
import { getRpm } from "./fanControl.repository.js";
import { getNextWeekdayDate } from '../utils/cron_date.js';
import { getWeeklyCron } from '../utils/cron_date.js';
import { Gateway, GatewayManager } from '../realGatewayManager.js';
import { addWeeks } from "date-fns";
import { sleep } from "../utils/sleep.js";
import { groupSchedule } from "../utils/schedule.js";
import { retryFanOnOffofGroup } from "../utils/schedule.js";
import { pushAalrm } from "../utils/schedule.js";

const userRepository = AppDataSource_1.getRepository(User);
const gateRepository = AppDataSource.getRepository(Gate);
const fanRepository = AppDataSource.getRepository(Fan);
const houseRepository = AppDataSource.getRepository(House);
const groupRepository = AppDataSource.getRepository(Group);
const fanGroupMappingRepository = AppDataSource.getRepository(fanGroupMapping);
const modelTypeRepository = AppDataSource.getRepository(ModelType);
const reservationScheduleRepository = AppDataSource.getRepository(reservationSchedule);
const userTokenMappingRepository = AppDataSource_1.getRepository(UserTokenMapping);


// 그룹 등록(추가)
export async function createGroup(groupData) {
    try {
        const existingGroup = await groupRepository.findOne({ where: {house_id: groupData.house_id, name: groupData.name}});
        const existingHouse = await houseRepository.findOne({ where: {id: groupData.house_id} });
        
        if(existingHouse) {
            if (existingGroup) {
                console.log("하우스 내 등록된 그룹 있음.");
                return { status: 'fail', message: '하우스 내 등록된 그룹이 있음', group: existingGroup};
            }

            const newGroup = groupRepository.create({ 
                house_id: existingHouse.id, 
                name: groupData.name 
            });
            
            const groups = await groupRepository.find();
            newGroup.ordering = groups.length + 1;
            const saveGroup = await groupRepository.save(newGroup);
    
            console.log("Group saved = ", saveGroup);

            return { status: 'success', message: '그룹 생성 완료', group: saveGroup };
        } else {
            console.log("작업장 id가 잘못되었습니다.");
            return { status: 'fail', message: '작업장 id 오류' };
        }
    }catch(error) {
        console.error("그룹 생성 중 오류 발생 = ", error);
        return { status: "error", message: "그룹 생성 중 오류 발생"};
    }
}


// 그룹 맵핑
export async function mappingFanGroup(mappingData) {
    try {
        // mappingData = {
        //     group_id: 2,
        //     fans: 팬정보들
        // }
        console.log("그룹 맵핑")
        const fans = mappingData.fans;

        console.log("팬 리스트 = ", fans);

        for (const fan of fans) {
            const newFanGroupMapping =fanGroupMappingRepository.create({
                group_id: mappingData.group_id,
                house_id: mappingData.house_id,
                fan_id: fan.id                
            });

            await fanGroupMappingRepository.save(newFanGroupMapping);
        }

        console.log("그룹 맵핑 완료");
    }catch(error) {
        console.error("그룹 생성 중 오류 발생 = ", error);
        return { status: "error", message: "그룹 생성 중 오류 발생"};
    }
}

// 그룹리스트 조회
export async function getGroupList(house_id) {
    try {
        const groups = await groupRepository.find({
            where: { house_id: house_id },
            order: { ordering: "ASC" }
        });

        const returnData = [];
        // 그룹id, 그룹명, 팬개수, 팬이름, 팬이 속한 게이트이름
        for (const group of groups) {
            const fanCount = await fanGroupMappingRepository.count({where: {group_id: group.id}});
            const fanGroupMaps = await fanGroupMappingRepository.find({where : {group_id : group.id}});
            

            const fanList = []
            for (const fanGroupMap of fanGroupMaps) {
                const fan = await fanRepository.findOne({where: {id: fanGroupMap.fan_id}});
                const gate = await gateRepository.findOne({where: {id: fan.gate_id}});

                const fanInfo = {
                    fan_id: fan.id,
                    fan_name: fan.name,
                    fan_code: fan.fan_id,
                    gate_id: gate.id,
                    gate_name: gate.name
                }
                fanList.push(fanInfo);
            }

            const groupData = {
                group_id: group.id,
                group_name: group.name,
                group_ordering: group.ordering,
                fan_count: fanCount,
                fan_list: fanList
            }

            returnData.push(groupData);
        }

        return { status: 'success', message: '그룹 조회 완료', groupList: returnData };
       
    } catch (error) {
        console.log(error);
    }
}

// 그룹 상세 조회
export async function getDetailGroupInfo(house_id, group_id) {
    try {
        const group = await groupRepository.findOne({where: {id: group_id}});
        if (!group) {
            return {status: 'error', message: '존재하는 그룹 없음'};
        }
        
        console.log("group = ", group);

        
        const mappings = await fanGroupMappingRepository.find({where: {group_id: group_id}});

        const fanList = [];
        for (const mapping of mappings) {
            const fan = await fanRepository.findOne({where: {id: mapping.fan_id}});
            const gate = await gateRepository.findOne({where: {id: fan.gate_id}});

            const fanInfo = {
                fan_id: fan.id,
                fan_code: fan.fan_id, 
                fan_name: fan.name,
                gate_id: gate.id,
                gate_name: gate.name
            }

            fanList.push(fanInfo);
        };

        const returnData = {
            group_id: group.id,
            group_name: group.name,
            fan_count: fanList.length,
            fan_list: fanList
        }


        return { status: 'success', message: '그룹 조회 완료', returnData: returnData };
       
       
    } catch (error) {
        console.log(error);
    }
}

// 그룹 이름 수정
export async function updateGroupName(house_id, group_id, reqData) {
    try {
        // 하우스 내 그룹 탐색
        const group = await groupRepository.findOne({where: { id: group_id }});
        if (!group) {
            return {status: 'error', message: '존재하는 그룹 없음'};
        }

        // 같은 하우스(house_id) 내 다른 팬 중 동일 이름이 있는지 확인
        const duplicateCount = await groupRepository.count({
            where: {
                house_id: house_id,
                name: reqData.newName,
                id: Not(group_id),        // 자기 자신 제외
            }
        });
        if (duplicateCount > 0) {
            return { status: 'fail', message: '동명의 그룹이 있습니다.' };
        }

        group.name = reqData.newName;
        await groupRepository.save(group);
        
        return { status: 'success', message: '그룹 이름 변경 완료' };
       
    } catch (error) {
        console.log(error);
    }
}

// 그룹 순서 변경
export async function updateGroupOrder(house_id, reqData) {
    try {
       // reqData = [
        //     {
        //         idx: 1
        //         group_id: 1
        //     },
        //     {
        //         idx: 2
        //         group_id: 2
        //     }
        // ]

        for ( const data of reqData) {
            console.log("data =", data);
            const group = await groupRepository.findOne({where : { id: data.group_id, house_id: house_id }});
            group.ordering = data.idx;
            await groupRepository.save(group);
        }
      
        return { status: 'success', message: '그룹 순서 변경 완료' };
    } catch(error) {
        console.error("그룹 순서 변경 중 오류 발생 =", error);
        return { status: 'error', message: '그룹 순서 변경 중 오류 발생' };
    }   
}


// 팬 그룹으로 가져오기
export async function moveFanGroup(house_id, group_id, reqData) {
    try {
       // 하우스 내 그룹 탐색
       const group = await groupRepository.findOne({where: { id: group_id }});
       if (!group) {
           return {status: 'error', message: '존재하는 그룹 없음'};
       }

       const fanList = reqData

    //    console.log("fanList == ", fanList);

       for (const fan_id of fanList) {
            console.log("fan_id = ", fan_id);
            const fan = await fanRepository.findOne({where: {id: fan_id}});
            if(!fan) {
                return {status: 'error', message: '존재하는 팬 없음', fan: fan_id};
            }

            const originMapping = await fanGroupMappingRepository.findOne({where: {fan_id: fan_id}});

            if (originMapping) {
                await fanGroupMappingRepository.delete(originMapping);
            }

            const newMapping = fanGroupMappingRepository.create(
                {
                    fan_id: fan_id,
                    group_id: group_id,
                    house_id: house_id
                }
            )

            await fanGroupMappingRepository.save(newMapping);
       }
       
       return { status: 'success', message: '팬그룹 이동 완료' };
       
    } catch (error) {
        console.log(error);
    }
}

// 현재 그룹에서 팬 내보내기
export async function removeFans(house_id, group_id, reqData) {
    try {
       // 하우스 내 그룹 탐색
       const group = await groupRepository.findOne({where: { id: group_id }});
       if (!group) {
           return {status: 'error', message: '존재하는 그룹 없음'};
       }

       const moveGroup_id = reqData.moveGroup_id;
       const fanList = reqData.fan_list;

       for (const fan_id of fanList) {
            console.log("fan_id = ", fan_id);
            const fan = await fanRepository.findOne({where: {id: fan_id}});
            if(!fan) {
                console.log("존재하는 fan 없음");
                return {status: 'error', message: '존재하는 팬 없음', fan: fan_id};
            }

            await fanGroupMappingRepository.delete({ fan_id, group_id });

            
            if (moveGroup_id) {
                console.log("moveGroup_id = ", moveGroup_id);
                const newMapping = fanGroupMappingRepository.create(
                    {
                        fan_id: fan_id,
                        group_id: moveGroup_id,
                        house_id: house_id
                    }
                )
                await fanGroupMappingRepository.save(newMapping);
            }
       }
       
       return { status: 'success', message: '그룹에서 팬 내보내기 완료' };
       
    } catch (error) {
        console.log(error);
    }
}

// 그룹 플레이
export async function groupOnOff(reqData) {
    try {
         // reqData = {
        //     group_id,
        //     isPlaying,
        //     dir,
        //     speed_level
        // }

        
        console.log("groupReqData == ", reqData);
        // 하우스 내 그룹 탐색
        const group = await groupRepository.findOne({where: { id: reqData.group_id }});
        if (!group) {
            return {status: 'error', message: '존재하는 그룹 없음'};
        }

        const groupId = group.id;

        const mappings = await fanGroupMappingRepository.find({where: {group_id: groupId }});

        let failedFanNames = [];

        for (const mapping of mappings) {
            // info = {
            //     gate_id,
            //     fan_id,
            //     isPlaying,
            //     SPDHi,
            //     dir
            // }
            console.log("fan_id = ", mapping.fan_id);
            const fan = await fanRepository.findOne({where: {id: mapping.fan_id}});
            const info = {
                gate_id: fan.gate_id ?? null,
                fan_id: fan.id ?? null,
                isPlaying: reqData.isPlaying ?? null,
                SPDHi: fan.SPDHi ?? null,
                speed_level: reqData.speed_level ?? null,
                dir: reqData.dir ?? null
            }

            console.log("info == ", info);

            if(reqData.isReserve === true) {
                console.log("그룹 예약 플레이");
                // 예약 
                // 오류 났을때 모아서 푸시
                 // ✅ 재시도 포함된 fanOnOff
                const ok = await retryFanOnOffofGroup(info);

                console.log("ok == ", ok);
                if (!ok) {
                    console.error('[fanOnOff] 2회 재시도 후에도 실패 예약 작업 중단');
                    failedFanNames.push(fan.name);
                }

                console.log('fanOnOff 시도 완료');
            } else {
                // await fanOnOff(info);
                const ok = await retryFanOnOffofGroup(info);

                console.log("ok == ", ok);
                if (!ok) {
                    console.error('[fanOnOff] 2회 재시도 후에도 실패 예약 작업 중단');
                    failedFanNames.push(fan.name);
                }
            }         

            // await fanOnOff(info);
            // try {
            //     await fanOnOff(info);           // 성공하면 그대로 종료
            //   } catch (err) {
            //     console.error(`[fanOnOff] 실패`, err);
            //     // 최대 횟수 초과면 false 반환
            //     // if (i === maxAttempts) return false;
          
            //     // // 다음 시도 전 잠깐 대기(0.5초; 필요 없으면 0으로)
            //     // await new Promise(r => setTimeout(r, delayMs));
            //   }

            await sleep(100);
        }

        console.log("failFanName == ", failedFanNames);

        // 예약이 끝난 후(여러번 처리라면), 푸시
        if (failedFanNames.length > 0) {
                const joinedNames = failedFanNames.join(',');
                let bodyMessage;
            if(reqData.isReserve === true) {
                bodyMessage = `[예약] (${reqData.house_name})의 그룹(${group.name})의 (${joinedNames})팬 연결 오류`;
                
            } else {
                bodyMessage = `${reqData.house_name}의 그룹(${group.name})의 (${joinedNames})팬 연결 오류`;
            }
            pushAalrm(reqData.user_id, bodyMessage);
        }
        
        return { status: 'success', message: '그룹 플레이 완료' };
       
    } catch (error) {
        console.log(error);
    }   
}

// export async function retryFanOnOff(info, maxAttempts = 3, delayMs = 500) {
//     for (let i = 1; i <= maxAttempts; i++) {
//       try {
//         await fanOnOff(info);           // 성공하면 그대로 종료
//         return true;
//       } catch (err) {
//         console.error(`[fanOnOff] 실패 ${i}/${maxAttempts}`, err);
//         // 최대 횟수 초과면 false 반환
//         if (i === maxAttempts) return false;
  
//         // 다음 시도 전 잠깐 대기(0.5초; 필요 없으면 0으로)
//         await new Promise(r => setTimeout(r, delayMs));
//       }
//     }
//   }


// 그룹 속도 변경
export async function groupSpeedControl(reqData) {
    try {
        // reqData = {
        //     group_id,
        //     speed_level
        // }

        // 하우스 내 그룹 탐색
        const group = await groupRepository.findOne({where: { id: reqData.group_id }});
        if (!group) {
            return {status: 'error', message: '존재하는 그룹 없음'};
        }

        const groupId = group.id;

        const mappings = await fanGroupMappingRepository.find({where: {group_id: groupId }});
        console.log("mappings = ", mappings);

        for (const mapping of mappings) {
            // info = {
            //     gate_id,
            //     fan_id,
            //     speed_level,
            //     SPDHi
            // }
            console.log("fan_id = ", mapping.fan_id);
            const fan = await fanRepository.findOne({where: {id: mapping.fan_id}});
            
            if (!fan.model_type) {
                console.log("모델타입 저장");
                const getrpm = await getRpm(fan.gate_id, fan.id);
                const SPDHi = getrpm.result.message[0].SPDHi;
                const modelType = await modelTypeRepository.findOne({where: { SPDHi: SPDHi }});
                fan.model_type = modelType.id;
                fan.model_type_name = modelType.name;
                await fanRepository.save(fan);
            }

            const modelType = await modelTypeRepository.findOne({where: {id: fan.model_type}});
            const info = {
                gate_id: fan.gate_id ?? null,
                fan_id: fan.id ?? null,
                speed_level: reqData.speed_level ?? null,
                SPDHi: modelType.SPDHi ?? null
            }

            console.log("info === ", info);

            await speedControl(info);
            await sleep();
        }

        group.speed_level = reqData.speed_level;

        await groupRepository.save(group);

        return { status: 'success', message: '그룹 속도 변경 완료' };
       
    } catch (error) {
        console.log(error);
    }
}

// 그룹 삭제
export async function deleteGroup(house_id, group_id) {
    try {
        // 하우스 내 그룹 탐색
        const group = await groupRepository.findOne({where: { id: group_id }});
        if (!group) {
            return {status: 'error', message: '존재하는 그룹 없음'};
        }

        // 그룹 id
        const groupId = group.id;

        // 그룹 맵핑에서 팬 row 삭제        
        await fanGroupMappingRepository.delete({ group_id: groupId});
        
        // 그룹 삭제
        await groupRepository.delete({id: group_id});

        return { status: 'success', message: '그룹 삭제' };
       
    } catch (error) {
        console.log(error);
    }
}

// 그룹 예약 기능
export async function createGroupSchedule(house_id, group_id, reqData) {
    
    try {
        // reqData = {
        //     play_req = {
        //      isPlaying,
        //      speed_level,
        //      dir
        //     },
        //     date_req = {
        //      day
        //      time
        //      repeat
        //     }
        // }
        const {
            play_req: { isPlaying, speed_level, dir },
            date_req: { days, time, repeat }
          } = reqData;
        const [hour, minute] = time.split(':').map(t => Number(t));

        const onoffInfo = { group_id, isPlaying, dir, speed_level }; 
        const house = await houseRepository.findOne({where: {id: house_id}});
        const user_id = house.user_id;
        console.log("repeat == ", repeat);
        console.log("hour, minute == ", hour, minute);

        const raw = await (Number(repeat)            // repeat가 1‑truthy → 매주
        ? getWeeklyCron(days, hour, minute)        // 예) '0 9 * * 1,3'
        : getNextWeekdayDate(hour, minute)         // 예) { cron: '0 9 09 07 *' }
        );

        let cronExpressions = raw?.cron ?? raw; 
    
        let reservation;
        if (!reqData.reRegister) {
            const reservationSchedule = reservationScheduleRepository.create({
                house_id: house_id,
                group_id: group_id,
                days: days,
                one_day: cronExpressions.date ?? null,
                time: time,
                repeat: repeat,
                isPlaying: isPlaying,
                speed_level: speed_level,
                dir: dir
            });
    
            reservation = await reservationScheduleRepository.save(reservationSchedule);
        }
    
        // 문자열 하나만 반환될 수도 있으니 배열 보장
        if (!Array.isArray(cronExpressions)) {
            cronExpressions = [cronExpressions];
        }
    
        // 모든 cron 식에 대해 병렬로 스케줄 생성
        await Promise.all(
            cronExpressions.map(expr => groupSchedule(house.name, user_id, reservation.id, group_id, expr, onoffInfo))
        );
    
    
        return { status: 'success', message: '그룹 가동 예약이 등록되었습니다.'};
    } catch (error) {
        console.log(error);
    }
}
