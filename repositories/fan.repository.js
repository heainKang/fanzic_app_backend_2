import "reflect-metadata";
import { AppDataSource } from '../models/data-source.js';
import { Gate } from "../models/gate.js";
import { Fan } from "../models/fan.js";
import { House } from "../models/house.js";
import { Group } from "../models/group.js";
import { fanGroupMapping } from "../models/fan_group_mapping.js";
import { ModelType } from "../models/model_type.js"
import { fanControlLog } from "../models/fan_control_log.js";

import { In } from 'typeorm';
import { Not } from 'typeorm';
import { Gateway, GatewayManager } from '../realGatewayManager.js';
import { getRpm } from '../repositories/fanControl.repository.js';
import { group } from "console";

const gateRepository = AppDataSource.getRepository(Gate);
const fanRepository = AppDataSource.getRepository(Fan);
const houseRepository = AppDataSource.getRepository(House);
const fanGroupMappingRepository = AppDataSource.getRepository(fanGroupMapping);
const groupRepository = AppDataSource.getRepository(Group);
const modelTypeRepository = AppDataSource.getRepository(ModelType);
const fanControlLogRepository = AppDataSource.getRepository(fanControlLog);

// 팬등록
export async function createFan(fanData) {
    try {
        // fanData = {
        //     gate_id: 1,
        //     fanList = [
        //          {name: 안방, id: 01},
        //          {name: 주방, id: 02},
        //          {name: 아이방, id: 03},
        //      ]
        // }
        

        for (const fan of fanData.fanList) {
            console.log("fan_name = ", fan.name);
            const newFan = fanRepository.create(
                {
                    gate_id: fanData.gate_id,
                    name: `${fan.name}`,
                    fan_id: `${fan.id}`
                }
            )
            await fanRepository.save(newFan);
        }

        const fans = await fanRepository.find({where: {gate_id: fanData.gate_id}});

        return fans;

    } catch(error) {
        console.log(error);
    }
}

// 팬조회
export async function getFanList(house_id) {
    try {
        // 1) house_id에 속한 gate들 로드
        const gates = await gateRepository.find({
            where: { house_id: house_id, deleted_flag: 0 },
            select: ['id', 'name'],
        });

        console.log("gates == ", gates);
        const gateMap = new Map(gates.map(g => [g.id, g.name]));
        const gateIds = gates.map(g => g.id);
  
        // 2) 해당 gate들에 속한 fan들 로드
        const fans = await fanRepository.find({
            where: { gate_id: In(gateIds) },
            select: ['id', 'name', 'gate_id'],
        });
        const fanIds = fans.map(f => f.id);
  
        // 3) fanGroupMapping 일괄 로드
        const mappings = await fanGroupMappingRepository.find({
            where: { fan_id: In(fanIds) },
            select: ['fan_id', 'group_id'],
        });
        const mappingByFan = new Map(mappings.map(m => [m.fan_id, m.group_id]));
  
        // 4) group 정보 일괄 로드
        const groupIds = mappings.map(m => m.group_id);
        const groups = await groupRepository.find({
            where: { id: In(groupIds) },
            select: ['id', 'name'],
        });
        const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
        // 결과 조립
        const fanList = fans.map(fan => {
            const gid = mappingByFan.get(fan.id) || null;
            return {
            fan_id:    fan.id,
            fan_name:  fan.name,
            group_id:  gid,
            group_name: gid ? groupMap.get(gid) : null,
            gate_id:   fan.gate_id,
            gate_name: gateMap.get(fan.gate_id) || null,
            };
        });
  
        return {
            status: 'success',
            message: '팬리스트 조회 완료',
            returnData: fanList,
        };

    } catch(error) {
        console.log(error);
    }
    
}

// 팬조회
export async function getFanInfo(house_id, fan_id) {
    try {
        // 1) fan_id가 일하는 팬로드
        const fan = await fanRepository.findOne({where: {id: fan_id, deleted_flag: 0}});
        const gateId = fan.gate_id;
        // 2) fan의 정보, fan의 게이트 로드
        const gate = await gateRepository.findOne({where: {id: gateId}});
        const getrpm = await getRpm(gateId, fan.id);
        
        if (!fan.model_type) {
            console.log("모델타입 저장");
            const SPDHi = getrpm.result.message[0].SPDHi;
            const modelType = await modelTypeRepository.findOne({where: { SPDHi: SPDHi }});
            fan.model_type = modelType.id;
            fan.model_type_name = modelType.name;
            await fanRepository.save(fan);
        }


        const rpmValue = getrpm?.result?.message?.[0]?.rpm ?? null;
        // const connect_signal = rpmValue != null ? 1 : 0;
        const fanModelType = await modelTypeRepository.findOne({where: {id:fan.model_type}});

        if (!rpmValue || rpmValue == null) {
            const returnData = {
                connecting: 0,
                gate_id: gate.id,
                gate_name: gate.name,
                fan_id: fan.id,
                fan_name: fan.name,
                fan_code: fan.fan_id,
                fan_status: fan.motor_state,
                fan_rpm: 0,
                fan_speed: fan.speed_level,
                fan_status: 'Er10',
                fan_rotation_direction: fan.rotation_direction,
                fan_model_name: fan.model_type_name ?? null,
                fan_model_SPDHi: fanModelType.SPDHi ?? null,
                fan_register_date: new Date(fan.created_at).toISOString().slice(0, 10)
            }
    
            return {
                status: 'success',
                message: '팬정보 조회 완료',
                returnData: returnData,
            };

        }

        let rpm = 0
        const fanSpeed = fan.speed_level
        if ( fanSpeed === 1 ) {
            rpm = fanModelType.low_speed
        } else if ( fanSpeed === 2) {
            rpm = fanModelType.middle_speed
        } else if ( fanSpeed === 3) {
            rpm = fanModelType.high_speed
        } else if ( fanSpeed === 4) {
            rpm = fanModelType.turbo_speed
        }
        rpm  = Number(rpm) || 100;
        const formattedRpm = String(rpm).padStart(3, '0'); // "030"

        let connect_signal = 0
        if (getrpm.result.message[0].rpm) {
            connect_signal = 1
        } else {
            formattedRpm = '000'
        }

        // 팬의 마지막 fan-on 로그 가져오기
        const fanOn = await fanControlLogRepository.findOne({
            where: { fan_id: fan.id, command: 'fan-on' },
            order: { time_stamp: 'DESC' }
        });

        const fanOff = await fanControlLogRepository.findOne({
            where: { fan_id: fan.id, command: 'fan-off' },
            order: { time_stamp: 'DESC' }
        });
  
        let operatingTime = '0시간 0분';
        if (fanOn && fanOff && fanOn.time_stamp > fanOff.time_stamp) {
            let now = new Date().getTime(); // 현재 로컬 시간 기준
            // const now = Date.now();
            let commandTime = new Date(fanOn.time_stamp).getTime();
            
            let timeDiff = now - commandTime;

            if (timeDiff < 0) {
                timeDiff = timeDiff + (9 * 60 * 60 * 1000);
            }

            const hours = Math.floor(timeDiff / (1000 * 60 * 60)); // 시간 단위로 변환
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)); // 남은 밀리초 -> 분

            // 결과 문자열로 표시
            operatingTime = `${hours}시간 ${minutes}분`;
            //operatingTime = `${hours}시간`;
        }

        // console.log("getRPM = ", getRpm);

        console.log("operating_time == ", operatingTime);
        const returnData = {
            connecting: connect_signal,
            gate_id: gate.id,
            gate_name: gate.name,
            fan_id: fan.id,
            fan_name: fan.name,
            fan_code: fan.fan_id,
            fan_status: getrpm?.result?.message?.[0]?.status ?? null,
            fan_rpm: rpm ??  0,
            fan_speed: fan.speed_level,
            fan_rotation_direction: fan.rotation_direction,
            fan_model_name: fanModelType.name ?? null,
            fan_model_SPDHi: fanModelType.SPDHi ?? null,
            fan_register_date: new Date(fan.created_at).toISOString().slice(0, 10),
            fan_operating_time: operatingTime
        }

        return {
            status: 'success',
            message: '팬정보 조회 완료',
            returnData: returnData
        };

    } catch(error) {
        console.log(error);
    }
    
}


// 팬 상세정보 조회
export async function getDetailFanInfo(house_id, fan_id) {
    try {
        // 1) fan_id가 일하는 팬로드
        const house = await houseRepository.findOne({where: {id: house_id}});
        const fan = await fanRepository.findOne({where: {id: fan_id}});
        if (!fan) {
            return {status: 'error', message: '존재하는 팬 없음'};
        }
        const gateId = fan.gate_id;
        // 2) fan의 정보, fan의 게이트 로드
        const gate = await gateRepository.findOne({where: {id: gateId}});
        const mapping = await fanGroupMappingRepository.findOne({where: {fan_id: fan.id}});

        console.log("mapping", mapping);

        const group = mapping ? await groupRepository.findOne({ where: { id: mapping.group_id } }) : null;
      
        if (!fan.model_type) {
            console.log("모델타입 저장");
            const getrpm = await getRpm(gateId, fan.id);
            const SPDHiValue = getrpm?.result?.message?.[0]?.SPDHi ?? null;
            //const SPDHi = getrpm.result.message[0].SPDHi;
            const SPDHi = SPDHiValue;
            const modelType = await modelTypeRepository.findOne({where: { SPDHi: SPDHi }});
            fan.model_type = modelType.id;
            fan.model_type_name = modelType.name;
            await fanRepository.save(fan);
        }

        const fanModelType = await modelTypeRepository.findOne({where: {id:fan.model_type}});
     
        const returnData = {
            fan_id: fan.id,
            fan_name: fan.name,
            house_id: house.id,
            house_name: house.name,
            group_id : group?.id ?? null,
            group_name: group?.name ?? null,
            gate_id: gate.id,
            gate_name: gate.name,
            fan_code: fan.fan_id,
            wifi: gate.wifi_name,
            ip_adr: gate.ip_adr,
            mac_adr: gate.mac_adr,
            model_type: fanModelType.name,
            firmware: gate.firmware
        }

        return {
            status: 'success',
            message: '팬정보 조회 완료',
            returnData: returnData,
        };

    } catch(error) {
        console.log(error);
    }
    
}


// 팬 이름 변경
export async function updateName(fan_id, newName) {
    try {
        const fan = await fanRepository.findOne({where: {id: fan_id}});

        // 3) 같은 게이트(gate_id) 내 다른 팬 중 동일 이름이 있는지 확인
        const duplicateCount = await fanRepository.count({
            where: {
            gate_id: fan.gate_id,
            name: newName,
            id: Not(fan_id),        // 자기 자신 제외
            }
        });
        if (duplicateCount > 0) {
            return { status: 'fail', message: '중복된 팬이 있습니다.' };
        }
  
        // 4) 중복 없으면 바로 업데이트
        fan.name = newName;
        await fanRepository.save(fan);
        //await fanRepository.update(fan_id, { name: newName });
    
        return { status: 'success', message: '팬 이름 변경 완료' };

    } catch(error) {
        console.log(error);
    }
    
}

// 그룹에서 팬 빼기
export async function moveGroup(house_id, fan_id, moveGroup_id) {
    try {
        const fan = await fanRepository.findOne({where: {id: fan_id}});
        if(!fan) {
            return { status: 'error', message: '팬이 존재하지 않습니다.' };
        }

        const mapping = await fanGroupMappingRepository.findOne({where: {fan_id: fan_id}});


        if(!mapping) {
            const newMapping = fanGroupMappingRepository.create({
                fan_id: fan_id,
                group_id: moveGroup_id,
                house_id: house_id
            });

            await fanGroupMappingRepository.save(newMapping);
        } else {
            if (moveGroup_id === 0 || moveGroup_id === null || !moveGroup_id) {
                await fanGroupMappingRepository.delete({fan_id: fan_id});
              
            } else {
                mapping.group_id = moveGroup_id;
                await fanGroupMappingRepository.save(mapping);
                
            }
        }
       
        return { status: 'success', message: '팬 그룹이동 완료' };

    } catch(error) {
        console.log(error);
    }
    
}