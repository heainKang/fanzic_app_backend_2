import express from 'express';
import dotenv from "dotenv";
dotenv.config();

import "reflect-metadata";
import { In } from 'typeorm';
import { AppDataSource } from '../models/data-source.js';
import { Gate } from "../models/gate.js";
import { Fan } from "../models/fan.js";
import { fanGroupMapping } from "../models/fan_group_mapping.js";
import { createFan } from '../repositories/fan.repository.js';
import { createGroup } from '../repositories/group.repository.js';
import { mappingFanGroup } from "../repositories/group.repository.js";
import { House } from "../models/house.js";
import { Group } from '../models/group.js';
import { group } from "console";
import { Gateway, GatewayManager } from '../realGatewayManager.js';
import { getRpm } from '../repositories/fanControl.repository.js';
import { sendCFMessage } from './sendCFMessage.repository.js';


import { Not } from 'typeorm';
import { SimpleConsoleLogger } from "typeorm";
import { time } from "console";
import client from '../mqtt_client_CF.js';
import { setFlagsFromString } from 'v8';


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



// 게이트 등록(추가)
export async function createGate(gateData) {
    try {
        // gateData = {
        //     SSID,
        //     house_id,
        //     name,
        //     wifi_name,
        //     mac_adr,
        //     fan_list
        // }

        const existingHouse = await houseRepository.findOne({ where: {id: gateData.house_id} });
        const existingGate = await gateRepository.findOne({ where: {house_id: existingHouse.id, SSID: gateData.SSID, deleted_flag: 0}});
        const fanList = gateData.fan_list;

        console.log("하우스 = ", existingHouse);

        if(existingGate) {
            console.log("등록된 게이트 있음");
            return { status: 'fail', message: '등록된 게이트입니다.', existingGate: existingGate};
        }

        console.log("게이트 등록시작")

        
        const newGate = gateRepository.create({
            house_id: existingHouse.id,
            name: gateData.name,
            SSID: gateData.SSID,
            wifi_name: gateData.wifi_name,
            mac_adr: gateData.mac_adr,
            fan_count: fanList.length
        });

        const savedGate = await gateRepository.save(newGate);
        console.log("Gate saved = ", savedGate);

        // 게이트에 딸린 팬리스트
        console.log("팬 등록 시작");
        
        // fanList = [
        //     {name: 안방, id: 01},
        //     {name: 주방, id: 02},
        //     {name: 아이방, id: 03},
        // ]
        const fanData = {
            gate_id: savedGate.id,
            fanList: fanList
        }
        const fans = await createFan(fanData);
        console.log("팬 등록 완료");

        // 그룹 만들기 (게이트, 팬, 그룹맵핑 생성)
        if (gateData.isGroup == 1) {
            const groupData = {
                house_id: gateData.house_id,
                name: `${savedGate.name}그룹`
            };
            const createdGroup = await createGroup(groupData); 

            console.log("만들어진  그룹 =  ", createdGroup.group);
            const mappingData = {
                group_id: createdGroup.group.id,
                house_id: createdGroup.group.house_id,
                fans: fans
            }

            console.log("mappingData = ", mappingData);
            const createdMapping = await mappingFanGroup(mappingData);

            return { status: 'success', message: '게이트 생성 완료', group_id: createdGroup.group.id, fans: fans };
        } else {
            // 팬생성 후 그룹 생성 x
            return { status: 'success', message: '게이트 생성 완료', gate_id: savedGate.id, fans: fans };
        }     
    } catch(error) {
        console.log("팬등록 중 에러 = ", error);
    }
}

//게이트웨이 등록시 초기팬 데이터정보를 리턴함.
export async function getInitFanInfoInGateway(macAddr) {
    try {
        // resMsg가 중요
        console.log("getInitFanInfoInGateway repo 호출");
        var resMsg = await getUnitCountInGateway(macAddr); // mqtt 통해서 유닛 카운트 조회하기
        console.log("resMsg = ", resMsg); // 유닛카운트를 통해 얻은 resMsg..
        // resMsg 유효성 검사
        if (resMsg == null || !resMsg ) {
            return ("resMsg null error");
        }
        // if (resMsg == null || !resMsg || typeof resMsg.unit_cnt === 'undefined' || resMsg.unit_cnt === null) {
        //     return ("fanlist error");
        // }
    
        resMsg.unit_cnt = Number(resMsg.unit_cnt);
        // console.log("unit_cnt = ", resMsg.unit_cnt); // 유닛카운트를 통해 얻은 resMsg..
        if (isNaN(resMsg.unit_cnt) || resMsg.unit_cnt <= 0) {
            return ("fan count error");
            // throw new Error('unit_cnt 값이 올바르지 않습니다.');
        }

        // unit_cnt를 통해 fan_list 재정의
        let fan_list = [];

        for (let i = 1; i <= resMsg.unit_cnt; i++) {
            // i가 1~9이면 앞에 0을 붙여 "01", "02" 등의 문자열을 생성하고, 10 이상이면 그대로 문자열 변환
            let formattedName = i < 10 ? '0' + i : i.toString();
            fan_list.push({ id: i, name: formattedName });
        }

        console.log("등록 전 팬리스트 == ",fan_list);

        const returnData = {
            fanList: fan_list
        }

        return returnData;
        
    } catch (error) {
        console.error("getInitFanInfoInGateway error:", error.message);
        return { status: 'fail', message: error.message };
    }
    
}

// 게이트리스트 조회
export async function getGatewayList(house_id) {
    try {
         // 1) 게이트만 먼저 조회
        const gates = await gateRepository.find({ where: { house_id: house_id, deleted_flag: 0 } });
        const gateIds = gates.map(g => g.id);

        // 2) 해당 게이트의 팬들을 한 번에 조회
        const fans = await fanRepository.find({
            where: { gate_id: In(gateIds), deleted_flag: 0 }
        });
        const fanIds = fans.map(f => f.id);

        // 3) 팬↔그룹 매핑을 한 번에 조회
        const mappings = await fanGroupMappingRepository.find({
            where: { fan_id: In(fanIds) }
        });
        const groupIds = mappings.map(m => m.group_id);

        // 4) 매핑된 그룹들을 한 번에 조회 (매핑이 없으면 빈 배열)
        const groups = groupIds.length
            ? await groupRepository.find({ where: { id: In(groupIds) } })
        : [];

        // 5) Map 생성: 팬ID→매핑, 그룹ID→그룹
        const mappingByFanId = new Map(mappings.map(m => [m.fan_id, m]));
        const groupById = new Map(groups.map(g => [g.id, g]));

        // 6) 게이트별 팬묶음 만들기
        const fansByGateId = gates.reduce((acc, gate) => {
            acc[gate.id] = [];
            return acc;}, {});
            fans.forEach(fan => {
            fansByGateId[fan.gate_id].push(fan);
        });

        // 7) 최종 결과 조합
        const gateList = gates.map(gate => {
        const gateFans = fansByGateId[gate.id] || [];
        const fanList = gateFans.map(fan => {
            const map = mappingByFanId.get(fan.id);
            const grp = map ? groupById.get(map.group_id) : null;
            
            return {
                fan_id:    fan.id,
                fan_name:  fan.name,
                fan_code: fan.fan_id,
                group_id:   grp?.id   ?? null,
                group_name: grp?.name ?? null
            };
        });

        const registerDate = new Date(gate.created_at);
        const formattedDate = registerDate.toISOString().slice(0, 10);

        return {
            id: gate.id,
            name: gate.name,
            mac_adr: gate.mac_adr,
            register_date: formattedDate,
            fan_count: gateFans.length,
            fanList
        };
        });

        return {
            status:  'success',
            message: '게이트 조회 완료',
            gateList
        };       
    } catch (error) {
        console.log(error);
    }
}

export async function getGateStatus(gateId) {
    try {
        const gate = await gateRepository.findOne({where : {id : gateId}});

        const resAllFanList = await getAllFanStatusInGateway(macAddr);
        console.log(gate);

        return gate;
       
    } catch (error) {
        console.log(error);
    }
}

// 게이트 이름 중복 조회
export async function checkName(house_id, name) {
    try {
        // mac_adr로 게이트 찾기
        const existingGate = await gateRepository.findOne({
            where : {house_id: house_id, name: name, deleted_flag: 0} 
        });

        if (existingGate) {
            console.log("하우스 내 등록된 게이트 있음.");
            return { status: 'fail', message: '하우스 내 등록된 게이트 있음', gate: existingGate.name};
        } else {
            console.log("하우스 내 등록된 게이트 없음.");
            return { status: 'success', message: '하우스 내 등록된 그룹이 없음'};
        } 
  
    } catch (error) {
        console.log(error);
    }
}


// 게이트 등록전 팬리스트 조회
export async function getFanList(mac_adr) {
    try {
        const gate = gatewayManager.getGatewayByMacAddress(mac_adr);
        
        if(gateway === null){
            return null;
        }

        const fan = gateway.getFan(fan_id);
        
        
        

        return gate;
       
    } catch (error) {
        console.log(error);
    }
}



export async function getUnitCountInGateway(macAddr) {
    try{
        var sub_topic = getSubscribeTopic(macAddr);
        console.log("sub_topic = ", sub_topic);
        var pub_topic = getPublishTopic(macAddr);
        console.log("pub_topic =", pub_topic);
        var pub_message = getPublishMessage_unit_count();

        console.log("pub_msg = ", pub_message);

        console.log(sub_topic, pub_topic, pub_message);

        console.log("팬개수 구하러가기")
        var res = await sendCFMessage(sub_topic, pub_topic, pub_message);
        console.log("getUnitCountInGateway..res=", res);
        return res.message[0];
    } catch(error){
        console.log('error: getUnitCountInGateway '+error)
        return null;
    }

    
}

function getPublishMessage_unit_count(){
    let pubMsg = '{"type":"cnt","motor_id":"","rpm":"","set":"","dir":""}';
    return pubMsg;
}


//subscribe 토픽 구성 
function getSubscribeTopic(macAddr){
    let strTopic= `FANZIC_CF/${macAddr}/dat`;
    
    return strTopic 
    
    //getResponse(pubMsg)
}

//publish 토픽 구성 
function getPublishTopic(macAddr){
    let strTopic= `FANZIC_CF/${macAddr}/set`;
    
    return strTopic 
    
    //getResponse(pubMsg)
}

//새로운 mac address 인지 확인함. 
async function saveFanStatus(topic, msg){
    //{"type":"sta","unit_cnt":"02"}
    console.log("saveFanStatus..topic=", topic) // 1C:69:20:CE:F5:A8
    console.log("saveFanStatus..msg=", msg) // { type: 'sta', unit_cnt: '02' }
    try{
        let parts = topic.split("/");
        let macAddr = parts[0];

        if(parts.length  > 1) {
            macAddr = parts[1];
        }
    

        const staMsgJson = msg;
        
        // 아래는 msg(staMsgJson)가 정상적인 문구가 아닐때 실행하는 로직
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        if (staMsgJson.type === undefined ) {
            //console.log("type이 존재하지 않습니다.");
            return false;
        }

        if (staMsgJson.type === "unit" && staMsgJson.motor_id !== "00" ) {
            //console.log("type이 sta가 아닙니다.");
            
            var gateWay = gatewayManager.getGatewayByMacAddress(macAddr);
            if(gateWay=== null)
                return false;

            gateWay.setFanStatus(staMsgJson.motor_id, staMsgJson.rpm, staMsgJson.dir, staMsgJson.status)
            return true;
        }

        if (staMsgJson.unit_cnt == undefined){
            //console.log("unit_cnt이 존재하지 않습니다.");
            return false;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        console.log(staMsgJson); 
        var numList = generateNumberArray(staMsgJson.unit_cnt); // 여기서 fanList얻어오지?? unit_cnt는 2임. 그냥 2에대해서 리스트 만드는 것.

        gatewayManager.addGateway(macAddr, numList);

        console.log("gateway 새로 생성.");
    } catch (error) {
        console.log("checkNewMacAddr..error:", error);
        return false;
      }

    return true;

}

// function sendCFMessage(sub_topic, pub_topic, pub_message){

//     return new Promise((resolve, reject) => {
//         console.log("sendCFMessage=sub_topic:", sub_topic, "pub_topic=", pub_topic, "message=", pub_message)
//         //client.subscribe(`FANZIC_CF/1C:69:20:CE:F5:B0/dat`, (err) => {
//         client.subscribe(sub_topic, (err) => {
//             if(err){
//                 reject(new Error('Subscription error.'));
//                 return;
//             }

//             //let pubMsg = '{"type":"sta","motor_id":"00","rpm":"","set":"","dir":""}'
//             let pubMsg = pub_message;
//             const pubMsgJson = JSON.parse(pubMsg);

//             //client.publish("FANZIC_CF/1C:69:20:CE:F5:B0/set", pubMsg, () => {
//             client.publish(pub_topic, pubMsg, () => {
//                     console.log("mqtt publish..topic=",pub_topic, " msg=", pubMsg)
//                 });
                
//             let isResponseSent = false;
//             // 타임아웃을 설정하여 응답이 오지 않는 경우 처리
//             const timeout = setTimeout(() => {
//                 if (!isResponseSent) {
//                     isResponseSent = true;
//                     client.removeListener('message', runMessageHandler);
//                     reject(new Error('Timeout waiting for MQTT message.'));
//                     return;
//                 }
//             }, 6000);  // 5초 타임아웃

//                 // 메시지 수신 처리
//             let msgList = [];
//             let timer = null;

//             const runMessageHandler = (topic, message) => {
//                 let connectedClientMsg = message.toString();
//                 isResponseSent = true;
//                 //console.log("mqtt runMessageHandler..topic=",topic, " msg=", connectedClientMsg);

//                 const escapedMsg = escapeJsonString(connectedClientMsg);
//                 const staMsg = JSON.parse(escapedMsg);

//                 if(pubMsgJson.type === "cnt"){
//                     if((staMsg.type !== "sta") || (staMsg.unit_cnt === undefined) ){
//                         //return;
//                     }else{
//                         msgList.push(staMsg)
//                     }

//                 } else if((staMsg.type === pubMsgJson.type) && (staMsg.motor_id === pubMsgJson.motor_id)){
//                         msgList.push(staMsg)
//                         //return false;
//                 }

//                 console.log("msgList=", msgList);
//                 console.log("msgList.length=", msgList.length);
//                 if(msgList.length === 1){
                    
//                     isResponseSent = true;
//                     client.removeListener('message', runMessageHandler);
//                     //resolve({ topic:topic, message: msgList });
//                     resolve({ message: msgList });
//                     return;

//                 } 

//             };

//                 // 메시지 리스너 등록
//             client.on('message', runMessageHandler);

//         });
//     });
// }

function escapeJsonString(jsonString) {

    var replaceStr = jsonString.trim();
    replaceStr = replaceStr.replace(/[\u0000-\u001F\u007F]/g, char => {
        return "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0");
    });


    // JSON이 중괄호로 시작하지만 끝나지 않으면 닫아줌
    if (replaceStr.startsWith("{") && !replaceStr.endsWith("}")) {
        replaceStr += "}";
    }

    if (replaceStr.startsWith("[") && !replaceStr.endsWith("]")) {
        replaceStr += "]";
    }

    //console.log("3.escapeJsonString=", replaceStr);

    return replaceStr;
}

//"02"일 경우, ["01", "02"] 를 리턴함. 
function generateNumberArray(strNumber) { 
    // 숫자로 변환
    const num = parseInt(strNumber, 10);

    // "01"부터 num까지 문자열 배열 생성
    const result = Array.from({ length: num }, (_, i) => (i + 1).toString().padStart(2, "0"));

    return result;
}

// 게이트 상세정보 조회
export async function getDetailGateInfo(house_id, gate_id) {
    try {
        const house = await houseRepository.findOne({where: {id: house_id, deleted_flag: 0}});
        const gate = await gateRepository.findOne({where: {id: gate_id, deleted_flag: 0}});

        if (!gate) {
            return { status: 'fail', message: '게이트를 찾지 못했거나 삭제 되었습니다.' }
        }
        const gateId = gate.id;
        const fan = await fanRepository.find({
            where: {gate_id: gate_id},
            order: {id: "ASC"},
            take: 1
        })
        const fanId = fan.id;

        const fans = await fanRepository.find({where: {gate_id: gate_id}});
        const fanCount = await fanRepository.count({where: {gate_id: gate_id}});
        let fanList = []
        for (const fan of fans) {
            const mapping = await fanGroupMappingRepository.findOne({where: {fan_id: fan.id}});
            const group = mapping ? await groupRepository.findOne({ where: { id: mapping.group_id } }) : null;
            const fanInfo = {
                fan_id: fan.id,
                fan_name: fan.name,
                fan_code: fan.fan_id,
                group_id : group?.id ?? null,
                group_name: group?.name ?? null
            };
            fanList.push(fanInfo);
        }
    
        
        const getrpm = await getRpm(gateId, fanId);

        const rpmValue = getrpm?.result?.message?.[0]?.rpm ?? null;
        const connect_signal = rpmValue != null ? 1 : 0;
        // console.log("getrpm = ", getrpm)
        // let connect_signal = 0
        // if (getrpm.result.message[0].rpm) {
        //     connect_signal = 1
        // }

        const returnData = {
            house_id: house.id,
            house_name: house.name,
            gate_id: gate.id,
            gate_name: gate.name,
            fan_count: fanCount,
            fan_list: fanList,
            wifi: gate.wifi_name,
            connecting: connect_signal,
            ip_adr: gate.ip_adr,
            mac_adr: gate.mac_adr,
            model: gate.model,
            firmware: gate.firmware,
            gate_register_date: new Date(gate.created_at).toISOString().slice(0, 10)
        }
       
    
        return { status: 'success', message: '게이트 상세정보 조회 완료', returnData: returnData };
    } catch(error) {
        console.log("게이트 이름 변경 중 에러 = ", error);

    }
}



// 게이트 이름 변경
export async function updateName(gate_id, newName) {
    try {
        const gate = await gateRepository.findOne({where: {id: gate_id}});

        // 3) 같은 게이트(gate_id) 내 다른 팬 중 동일 이름이 있는지 확인
        const duplicateCount = await gateRepository.count({
            where: {
            house_id: gate.house_id,
            name: newName,
            id: Not(gate_id),        // 자기 자신 제외
            }
        });
        if (duplicateCount > 0) {
            return { status: 'fail', message: '동명의 게이트가 있습니다.' };
        }
  
        // 4) 중복 없으면 바로 업데이트
        await gateRepository.update(gate_id, { name: newName });
    
        return { status: 'success', message: '게이트 이름 변경 완료' };
    } catch(error) {
        console.log("게이트 이름 변경 중 에러 = ", error);

    }
}

// 게이트 삭제 처리
export async function deleteGate(gate_id) {
    try {
        const gate = await gateRepository.findOne({where: {id: gate_id, deleted_flag: 0}});

        gate.deleted_flag = 1;
        await gateRepository.save(gate);

        const fans = await fanRepository.find({where: {gate_id: gate_id }});
        const fanIds = fans.map(f => f.id);
        // 1) deleted_flag 일괄 업데이트
        await fanRepository.update(
            { id: In(fanIds) },
            { deleted_flag: 1 }
        );
        
        //2) 매핑 일괄 삭제
        await fanGroupMappingRepository.delete({ fan_id: In(fanIds) });

        console.log("팬 삭제처리 완료");
        return { status: 'success', message: '게이트 삭제 처리 완료' };
    } catch (error) {
        console.log(error);
    }   
}