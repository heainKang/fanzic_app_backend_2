import express from 'express';
import dotenv from "dotenv";
dotenv.config();

// utils
import { SimpleConsoleLogger } from "typeorm";
import { time } from "console";
import client from '../mqtt_client_CF.js';
import { Gateway, GatewayManager } from '../realGatewayManager.js';
import { setFlagsFromString } from 'v8';
import { getAllsendCFMessage } from './getAllsendCFMessage.repository.js';
import { sendCFMessage } from './sendCFMessage.repository.js';
import { createFan } from '../repositories/fan.repository.js';
import { createGroup } from '../repositories/group.repository.js';
import { mappingFanGroup } from "../repositories/group.repository.js";
import { fanSchedule } from '../utils/schedule.js';
import { getNextWeekdayDate } from '../utils/cron_date.js';
import { getWeeklyCron } from '../utils/cron_date.js';

// DB
import "reflect-metadata";
import { AppDataSource } from '../models/data-source.js';
import { Gate } from "../models/gate.js";
import { Fan } from "../models/fan.js";
import { fanGroupMapping } from "../models/fan_group_mapping.js";
import { House } from "../models/house.js";
import { group } from "console";
import { ModelType } from '../models/model_type.js';
import { fanControlLog } from '../models/fan_control_log.js';
import { reservationSchedule } from '../models/reservation_schedule.js';


const gateRepository = AppDataSource.getRepository(Gate);
const fanRepository = AppDataSource.getRepository(Fan);
const houseRepository = AppDataSource.getRepository(House);
const fanGroupMappingRepository = AppDataSource.getRepository(fanGroupMapping);
const modelTypeRepository = AppDataSource.getRepository(ModelType);
const fanControlLogRepository = AppDataSource.getRepository(fanControlLog);
const reservationScheduleRepository = AppDataSource.getRepository(reservationSchedule);

const MQTT_CMD_TYPE = ["sta", "unit", "all", "cnt"]; //sta:상태얻어오기, unit:개별제어, all:전체제어, cnt:unit count
const gatewayManager = new GatewayManager();
const gateway = new Gateway();

const app = express();
app.use(express.json());

// IoT 디바이스가 연결되었을 때 메시지 수신
// function messageHandler(topic, message) {
//     console.log("메시지핸들러 시작");
//     let connectedClientMsg = message.toString();
//     console.log(`messageHandler:${topic}..${connectedClientMsg}`);
//     console.log("임시 팬등록2");
//     saveFanStatus(topic, connectedClientMsg);
//     console.log("메시지핸들러 종료");
// }

// // 리스너 등록
// client.on('message', messageHandler);

//새로운 mac address 인지 확인함. 
async function saveFanStatus(topic, msg){
    //{"type":"sta","unit_cnt":"02"}
    console.log("saveFanStatus..topic=", topic);
    console.log("saveFanStatus..msg=", msg);
    try{
        let parts = topic.split("/");
        let macAddr = parts[0];

        if(parts.length  > 1) {
            macAddr = parts[1];
        }
    
        const staMsgJson = JSON.parse(msg);

        console.log("staMsg.type == ", staMsgJson.type);
        if (staMsgJson.type === undefined ) {
            //console.log("type이 존재하지 않습니다.");
            console.log("1")
            return false;
        }

        if (staMsgJson.type === "unit" && staMsgJson.motor_id !== "00" ) {
            //console.log("type이 sta가 아닙니다.");
            console.log("2")
            var gateWay = gatewayManager.getGatewayByMacAddress(macAddr);
            if(gateWay=== null)
                return false;

            gateWay.setFanStatus(staMsgJson.motor_id, staMsgJson.rpm, staMsgJson.dir, staMsgJson.status)
            return true;
        }

        if (staMsgJson.unit_cnt == undefined){
            console.log("3")
            console.log("unit_cnt이 존재하지 않습니다.");
            return false;
        }

        console.log(staMsgJson); 
        var numList = generateNumberArray(staMsgJson.unit_cnt);
        gatewayManager.addGateway(macAddr, numList);

        console.log("gateway 새로 생성.");
    } catch (error) {
        console.log("checkNewMacAddr..error:", error);
        return false;
      }

    return true;

}

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

//gateway 상태를 얻음. 개별장치 상태를 얻어서 등록되지 않았을경우, 등록함. 
export async function getGatewayStatus(macAddr){
    console.log("getGatewayStatus=macAddress:", macAddr);
    const resAllFanList = await getAllFanStatusInGateway(macAddr);
    if(resAllFanList === null){
        return null;
    }
    
    console.log("getGatewayStatus..resAllFanList=", resAllFanList)
    var fan_id_list = []
    for(var i=0; i< resAllFanList.message.length;i++ ){
        var msg = resAllFanList.message[i]
        const staMsg = msg;//JSON.parse(msg);
        if (staMsg.type === undefined ) {
            console.log("type이 존재하지 않습니다.");
            continue;
        }
        if(staMsg.type === "unit" && staMsg.motor_id !== "00")
            fan_id_list.push(staMsg.motor_id)
    }
    var resGateway = gatewayManager.addGateway(macAddr, fan_id_list);
    if(resGateway == null){
        resGateway = gatewayManager.getGatewayByMacAddress(macAddr);
    }

    const { macAddress, ...result } = resGateway;
    return result;
}


//gateway의 unit count를 얻어옴. 
export async function getUnitCount(macAddr){
    console.log("getUnitCount=macAddress:", macAddr);
    const res = await getUnitCountInGateway(macAddr);
    if(res === null){
        return null;
    }
    
    const { type, ...result } = res;
    return result;
}



//gateway 상태를 얻음.
export async function getGatewayStatusById(gwId){
    console.log("getGatewayStatusById=gwId:", gwId);
    const gateWay = gatewayManager.getGatewayInfoById(gwId);
    if(gateWay === null){
        return null;
    }
    
    const resAllFanList = await getAllFanStatusInGateway(gateWay.macAddress);
    if(resAllFanList === null){
        return null;
    }
    
    console.log("getGatewayStatus..resAllFanList=", resAllFanList)
    return resAllFanList;
}


//gateway wifi reset
export async function resetGateway(gwId){
    try{
        const gateway = gatewayManager.getGatewayInfoById(Number(gwId));
        const macAddr = gateway.macAddress

        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_reset();

        var res = await sendCFMessage(sub_topic, pub_topic, pub_message);
        console.log("resetGateway..res=", res);
    } catch(error){
        console.log('error:resetGateway '+error)
        return 'error: resetGateway'+error;
    }
    return res;


}

export function getGatewayList(){
    return gatewayManager.getAllGateways();

}

export function removeAllGateways(){
    return gatewayManager.removeAllGateways();
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
//             console.log("timout 들어가기 전");
//             const timeout = setTimeout(() => {
//                 if (!isResponseSent) {
//                     isResponseSent = true;
//                     client.removeListener('message', runMessageHandler);
//                     reject(new Error('Timeout waiting for MQTT message.'));
//                     return;
//                 }
//             }, 4000);  // 5초 타임아웃

//             console.log("timout 들어간 후");
//                 // 메시지 수신 처리
//             let msgList = [];
//             let timer = null;

//             const runMessageHandler = (topic, message) => {
//                 console.log("runMHl 시작");
//                 let connectedClientMsg = message.toString();
//                 isResponseSent = true;
//                 //console.log("mqtt runMessageHandler..topic=",topic, " msg=", connectedClientMsg);

//                 const escapedMsg = escapeJsonString(connectedClientMsg);
//                 const staMsg = JSON.parse(escapedMsg);


//                 console.log("stgMsg.motor_id ==", staMsg.motor_id, pubMsgJson.motor_id);
//                 if(pubMsgJson.type === "cnt"){
//                     if((staMsg.type !== "sta") || (staMsg.unit_cnt === undefined) ){
//                         //return;
//                     }else{
//                         msgList.push(staMsg)
//                     }

//                 // } else if((staMsg.type !== pubMsgJson.type) && (staMsg.motor_id === pubMsgJson.motor_id)){
//                 //         msgList.push(staMsg)
//                 //         //return false;
//                 // }
//                  } else if((staMsg.type === 'unit' && pubMsgJson.type === 'sta') && (staMsg.motor_id === pubMsgJson.motor_id)){
//                     msgList.push(staMsg)
//                     //return false;
//                  } else if((staMsg.type === 'unit' && pubMsgJson.type === 'unit') && (staMsg.motor_id === pubMsgJson.motor_id)){
//                     msgList.push(staMsg)
//                     //return false;
//                  } else if((staMsg.type === 'unit' && pubMsgJson.type === 'sta') && (pubMsgJson.motor_id === "00")){
//                     msgList.push(staMsg)
//                     //return false;
//                  }

//                 console.log("msgList=", msgList);
//                 console.log("msgList.length=", msgList.length);
//                 if(msgList.length === 1){
//                     isResponseSent = true;
//                     client.removeListener('message', runMessageHandler);
//                     //resolve({ topic:topic, message: msgList });
//                     resolve({ message: msgList });
//                     return;

//                 } 

//                 console.log("끝인가?")
//             };
//             // 메시지 리스너 등록
//             client.on('message', runMessageHandler);
//         });
//     });
// }

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

//게시할 메시지 리턴함
//개별상태값 요청을 위한 메시지 구성 
function getPublishMessage_status(motorId){
    let strType= MQTT_CMD_TYPE[0]; //type: 0 - 상태얻어오기, 1 - 개별제어, 2-전체제어
    let pubMsg = `{"type":"${strType}","motor_id":"${motorId}","rpm":"","set":"","dir":""}`
    
    return pubMsg 
    
    //getResponse(pubMsg)
}

//전체상태값 요청을 위한 메시지 구성 
function getPublishMessage_all_status(){
    let strType= MQTT_CMD_TYPE[0]; //type: 0 - 상태얻어오기, 1 - 개별제어, 2-전체제어
    let pubMsg = `{"type":"${strType}","motor_id":"00","rpm":"","set":"","dir":""}`
    
    return pubMsg 
    
    //getResponse(pubMsg)
}

//개별제어 요청을 위한 메시지 구성 
function getPublishMessage_control(motorId, rpm=100, set="OFF", dir="00"){
    let strType= MQTT_CMD_TYPE[1]; //type: 0 - 상태얻어오기, 1 - 개별제어, 2-전체제어
    let pubMsg = `{"type":"${strType}","motor_id":"${motorId}","rpm":"${rpm}","set":"${set}","dir":"${dir}"}`
    
    return pubMsg 
    
    //getResponse(pubMsg)
}

//전체제어 요청을 위한 메시지 구성 
function getPublishMessage_all_control(rpm=100, set="OFF", dir="00"){
    let strType= MQTT_CMD_TYPE[2]; //type: 0 - 상태얻어오기, 1 - 개별제어, 2-전체제어
    let pubMsg = `{"type":"${strType}","motor_id":"00","rpm":"${rpm}","set":"${set}","dir":"${dir}"}`
    
    return pubMsg 
    
    //getResponse(pubMsg)
}

function getPublishMessage_reset(){
    let pubMsg = '{"type":"rst","motor_id":"00","rpm":"“000","set":"OFF","dir":"00"}';
    return pubMsg;
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


export async function getUnitCountInGateway(macAddr) {
    try{
        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_unit_count();

        console.log("pub_msg = ", pub_message);

        var res = await sendCFMessage(sub_topic, pub_topic, pub_message);
        console.log("getUnitCountInGateway..res=", res);
        return res.message[0];
    } catch(error){
        console.log('error: getUnitCountInGateway '+error)
        return null;
    }

    
}


//게이트웨이 등록시 초기팬 데이터정보를 리턴함.
export async function getInitFanInfoInGateway(macAddr) {

    var resMsg = await getUnitCountInGateway(macAddr);
    console.log("resMSG = ", resMsg);
    saveFanStatus(macAddr, resMsg);
    var gatewayInfo = gatewayManager.getGatewayByMacAddress(macAddr);
    return gatewayInfo;
    

}

//개별팬의 상태를 얻어옴.
export async function getFanStatus(macAddr, mortorId){
    try{
        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_status(mortorId);

        console.log("subt, pubt, pubm = ", sub_topic, pub_topic, pub_message);
        var res = await sendCFMessage(sub_topic, pub_topic, pub_message);

    } catch(error){
        console.log('error: getFanStatus '+error)
        return null;
    }

    return res;
}

//전체팬의 상태를 얻어옴.
export async function getAllFanStatusInGateway(macAddr, fanCount){

    try{
        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_all_status();

        var res = await getAllsendCFMessage(sub_topic, pub_topic, pub_message, fanCount);
        // console.log("getAllFanStatusInGateway..res=", res);
    } catch(error){
        console.log('error: getAllFanStatusInGateway '+ error)

        return null;
    }
    return res;
}


//개별팬 ON
async function setFanOn(macAddr, mortorId, rpm, dir){
    try{
        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_control(mortorId, rpm, "ON", dir);

        var res = await sendCFMessage(sub_topic, pub_topic, pub_message);
        console.log("setFanOn..res=", res);
    } catch(error){
        console.log('error: setFanOn '+error)
        return null;
    }
    return res;
}

//개별팬 OFF
async function setFanOff(macAddr, mortorId){
    try{
        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_control(mortorId, "000", "OFF", "00");

        var res = await sendCFMessage(sub_topic, pub_topic, pub_message);
        console.log("setFanOff..res=", res);
    } catch(error){
        console.log('error: setFanOff '+error)
        return null;
    }

    return res;
}


//전체팬 ON
async function setAllFanOn(macAddr, rpm, dir){
    try{
        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_all_control(rpm, "ON", dir);

        var res = await sendCFMessage(sub_topic, pub_topic, pub_message);
    } catch(error){
        console.log('error: setAllFanOn '+error)
        return null;
    }

    return res;
}

//전체팬 OFF
async function setAllFanOff(macAddr){
    try{
        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_all_control("100", "OFF", "00");

        var res = await sendCFMessage(sub_topic, pub_topic, pub_message);
    } catch(error){
        console.log('error: setAllFanOff '+error)
        return null;
    }

    return res;
}

//팬제어 api 
export async function fanCheck(gwId, fanId) {
    // const gateway_id = gwId;
    // const fan_id =fanId;
    // const gateway = gatewayManager.getGatewayInfoById(Number(gateway_id));

    const gateway_id = gwId;
    const fan_id = fanId;
    const fan = await fanRepository.findOne({where: {id: fan_id}});
    
    const gateway = await gateRepository.findOne({where: {id: gateway_id}});
    if(gateway){
        //var msgRes = await getFanStatus(gateway.macAddress, fanId);
        var msgRes = await getFanStatus(gateway.mac_adr, fan.name);

        console.log("fanCheck..msgRes=",msgRes.message);


        return {result: msgRes.message };
    }else {
        return { error: 'fanCheck error' };
    } 
}


//전체fan on/off
export async function fanAllOnOff(info) {

    console.log("fanAllOnOff..info=", info);
    const gatewayId = Number(info.gatewayId);
    const isPlaying = info.isPlaying;

    const rpm  = Number(info.rpm) || 100;
    const formattedRpm = String(rpm).padStart(3, '0'); // "030"
    //console.log(formattedRpm);

    const dir = info.dir || "00";


    const gateway = gatewayManager.getGatewayInfoById(gatewayId)
    if(gateway){
        if(isPlaying === "ON"){
            var msgRes = await setAllFanOn(gateway.macAddress, formattedRpm, dir);
            gateway.setAllFanStatus( formattedRpm, dir, "ON");
            //resolve({ result: msgRes });
            return { result: msgRes };
        }else{
            var msgRes = await setAllFanOff(gateway.macAddress);
            gateway.setAllFanStatus( formattedRpm, dir, "OFF");
            //resolve({ result: msgRes });
            return { result: msgRes };
        }
        
    }else {
        //reject({ error: 'fanOnOff error' });
        return { result: 'fanAllOnOff error' };
    }
}

//팬이름 set
export async function setFanName(info){
    console.log("setFanName..info=", info);
    const gatewayId = info.gatewayId;
    const fanId = info.fanId;
    const fanName = info.fanName;

    const gateway = gatewayManager.getGatewayInfoById(Number(gatewayId));
    const fan = gateway.getFan(fanId);

    if(fan == null){
        console.log("fan=null");
        return { result: 'setFanName error' };

    }
    
    fan.setName(fanName);
    return { result: fan };

}

export async function fanOnOff(info) {
    // info = {
    //     gate_id,
    //     fan_id,
    //     isPlaying,
    //     speed_level
    //     SPDHi
    //     dir
    // }

    console.log("fanOnOff..info=", info);
    // gate_id
    const gatewayId = info.gate_id;

    // 명령받는 팬 찾기
    const fan = await fanRepository.findOne({where: {id: info.fan_id}});
    if (!fan) {
        return {status: "error", message: "해당 팬 없음"}
    }
    const fanId = fan.fan_id;
    const isPlaying = info.isPlaying;
    const dir = info.dir || "00";
    console.log("req_info = ", gatewayId, fan.id, fanId, isPlaying);
    
    // 게이트 찾기    
    const gateway = await gateRepository.findOne({where: {id: gatewayId}});
    if (!gateway) {
        return {status: "error", message: "해당 게이트웨이 없음"}
    }

    // 팬모델타입 저장안되어 있다면 저장하기
    if (!fan.model_type) {
        console.log("모델타입 저장");
        const getrpm = await getRpm(fan.gate_id, fan.id);
        const SPDHi = getrpm.result.message[0].SPDHi;
        const modelType = await modelTypeRepository.findOne({where: { SPDHi: SPDHi }});
        fan.model_type = modelType.id;
        fan.model_type_name = modelType.name;
        await fanRepository.save(fan);
    }

    if(gateway){
        if(isPlaying === "ON"){
            console.log("fanOn");

            // 팬모델타입 찾기
            const fanModelType = await modelTypeRepository.findOne({where : {SPDHi: info.SPDHi}});

            // rpm 설정
            let rpm;
            const fanSpeed = info.speed_level   
            if ( fanSpeed === 1 || fanSpeed === null || fanSpeed === undefined) {
                rpm = fanModelType.low_speed
            } else if ( fanSpeed === 2) {
                rpm = fanModelType.middle_speed
            } else if ( fanSpeed === 3) {
                rpm = fanModelType.high_speed
            } else if ( fanSpeed === 4) {
                rpm = fanModelType.turbo_speed
            };
            rpm  = Number(rpm) || 100;
            const formattedRpm = String(rpm).padStart(3, '0'); // "030"
            console.log("formattedRpm = ", formattedRpm);

            console.log("msgRes info.. ==", gateway.mac_adr, fanId, formattedRpm, dir);
            
            // mqtt 명령 날리기
            var msgRes = await setFanOn(gateway.mac_adr, fanId, formattedRpm, dir);
            // console.log("msgRes == ", msgRes);
            
            // 팬 상태, 속도, 회전방향 저장
            fan.fan_status = msgRes.message[0].status;
            fan.speed_level = info.speed_level || 1;
            if (dir == "00") {
                fan.rotation_direction = 0 // 0: 순방향
            } else if (dir == "01") {
                fan.rotation_direction = 1 // 1: 역방향
            }
            await fanRepository.save(fan);

            // 0.03초 딜레이
            await sleep(30);

            // fanControlLog 저장
            const fanControlLog = await fanControlLogRepository.create({
                fan_id : info.fan_id,
                command : "fan-on"
            });
            await fanControlLogRepository.save(fanControlLog);
            
            // 반환
            return { status: 'success', message: 'Fan On 완료'};
        }else{
            console.log("fanOff");

            // mqtt 명령 날리기
            var msgRes = await setFanOff(gateway.mac_adr, fanId);
            // console.log("msgRes == ", msgRes);

            // 팬 상태, 속도 저장
            fan.fan_status = msgRes.message[0].status
            fan.speed_level = 1
            await fanRepository.save(fan);

            // 0.03초 딜레이 주기
            await sleep(30);

            // fanCotrolLog 저장
            const fanControlLog = await fanControlLogRepository.create({
                fan_id : info.fan_id,
                command : "fan-off"
            });
            await fanControlLogRepository.save(fanControlLog);
            
            // 반환
            return { status: 'success', message: 'Fan OFF 완료'};
        }
    } else {
        return { result: 'fanOnOff error' };
    }
    
}

export async function fanRotate(info) {
    console.log("fanRotate..info=", info);
    const gateway_id = info.gate_id;

    const fan = await fanRepository.findOne({where: {id: info.fan_id}});
    
    const fanId = fan.fan_id;
    const dir = info.dir;
    if(info.dir === undefined){
        return { error: 'fanRotate parameter error' };
    }else if(dir !== "00" && dir !== "01"){
        return { error: 'fanRotate dir error' };
    }

    
    const rpm  = Number(info.rpm) || 100;    
    // const rpm  = Number(fan.rpm) || 100;    
    const formattedRpm = String(rpm).padStart(3, '0'); // "030"
    console.log("formattedRpm == ",formattedRpm);

    // const gateway = gatewayManager.getGatewayInfoById(Number(gatewayId));
    const gateway = await gateRepository.findOne({where: {id: gateway_id}});
    if(gateway){
        var msgRes = await setFanOn(gateway.mac_adr, fanId, formattedRpm, dir);
        // gateway.setFanStatus(fanId, formattedRpm, dir, "ON");

        if (dir == "00") {
            fan.rotation_direction = 0 // 0: 순방향
        } else if (dir == "01") {
            fan.rotation_direction = 1 // 1: 역방향
        }
        await fanRepository.save(fan);

        return { status: 'success', message: `방향 변경(${fan.rotation_direction}) 완료`};
    }else {
        return { error: 'fanRotate error' };
    }

}

export async function speedControl(info) {
    // info = {
    //     gate_id,
    //     fan_id,
    //     speed_level,
    //     SPDHi
    // }
    
    console.log("speedControl..info=", info);
    const gateway_id = info.gate_id;    
    const fan = await fanRepository.findOne({where: {id: info.fan_id}});
    const fanId = fan.fan_id;

    console.log("풍속 변경 fan = ", fan);

    let dir = 0
    if (fan.rotation_direction == 0) {
        dir = "00"
    } else if (fan.rotation_direction == 1) {
        dir = "01"
    }

    let rpm = 0
    const fanSpeed = info.speed_level

    let SPDHi = null
    if (info.SPDHi === null || info.SPDHi === undefined) {
        const fanModel = await modelTypeRepository.findOne({where: {id: fan.model_type}});
        SPDHi = fanModel.SPDHi;
    }
    
    const fanModelType = await modelTypeRepository.findOne({where : {id: fan.model_type}});
    if ( fanSpeed === 1 ) {
        rpm = fanModelType.low_speed
    } else if ( fanSpeed === 2) {
        rpm = fanModelType.middle_speed
    } else if ( fanSpeed === 3) {
        rpm = fanModelType.high_speed
    } else if ( fanSpeed === 4) {
        rpm = fanModelType.turbo_speed
    }
            
    rpm = Number(rpm);
    const formattedRpm = String(rpm).padStart(3, '0'); // "030"
    const gateway = await gateRepository.findOne({where: {id: gateway_id}});

    if(gateway){
        console.log("넘기는 rpm = ", rpm);
        var msgRes = await setFanOn(gateway.mac_adr, fanId, formattedRpm, dir);
        // gateway.setFanStatus(fanId, formattedRpm, dir, "ON");
        fan.speed_level = fanSpeed;
        fan.rpm = msgRes.message[0].rpm;
        fan.fan_status = msgRes.message[0].status;
        await fanRepository.save(fan);
        return { status: 'success', message: '속도 변경 완료', speed_level: fan.speed_level };
    }else {
        return { error: 'speedControl error' };
    }
}


export async function getRpm(gwId, fanId) {
    console.log("getRpm..gwId, fanId=", gwId, fanId);
    const gateway_id = gwId;
    const fan_id = fanId;
    const fan = await fanRepository.findOne({where: {id: fan_id}});
    
    const gateway = await gateRepository.findOne({where: {id: gateway_id}});

    //const gateway = gatewayManager.getGatewayInfoById(Number(gateway_id));

    // console.log("gateway, fan = ", gateway, fan);
    
    if(gateway){
        try{
            //var msgRes = await getFanStatus(gateway.macAddress, fanId);
            var msgRes = await getFanStatus(gateway.mac_adr, fan.fan_id);
            return { result: msgRes };
        }
        catch (error) {
            console.log("getRpm..error:", error);
            return { error: 'getRpm error'+error };
          }
    }else {
        return { error: 'getRpm error' };
    }
}

export async function fanInfo(gwId, fanId) {
    console.log("fanInfo..gwId, fanId=", gwId, fanId);
    const gateway_id = gwId;
    const fan_id = fanId;

    try{

        const gateway = gatewayManager.getGatewayInfoById(Number(gateway_id));
        if(gateway === null){
            return null;
        }

        const fan = gateway.getFan(fan_id);
        if(fan === null){
            return [gateway, null];
        }
        
        console.log("gateway:", gateway);
        console.log("fan:", fan);
        return [{"gateway":gateway}, {"fan":fan}];

    } catch(error){
        console.log('error: fanInfo '+error)        
    }
    
    return null;
}

export function removeGateway(gwId){
    const res = gatewayManager.removeGatewayById(Number(gwId));
    return res;
}


export function setConfirmGateway(info){
   
    console.log("setConfirmGateway..info=", info);
    const gatewayId = info.gatewayId;
    const gatewayName = info.gatewayName;
    const bConfirm = info.confirm;
    const fanList = info.fans;
    console.log("fanList=", fanList);
    
    if(info.gatewayId === undefined){
        return { error: 'setConfirmGateway gatewayId parameter error' };
    }
    try{
        const gateway = gatewayManager.getGatewayInfoById(Number(gatewayId));
        if(gateway){
            gateway.setGatewayName(gatewayName);
            var msgRes = gateway.setConfirm(bConfirm);
            for(var fan of fanList){
                console.log("fan=", fan);
                gateway.setFanName(fan.id, fan.name);
            }

            return true;
        }else {
            console.log("setConfirmGateway error:gateway = null");
            return false;
        }
    } catch(error){
        console.log('error:setConfirmGateway '+error)
        return false;
    }
}



export function getNotConfirmedGateways(){
    return gatewayManager.getNotConfirmedGateways();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export async function getConfirmedGateways(){
    var gatewayList = gatewayManager.getConfirmedGateways();
    var result = []
    for( var gateway of gatewayList){

        var gatewayDict = {}

        const {id, name, macAddress, confirmed} = gateway;
        const gatewayInfo = {id, name, macAddress, confirmed}

        console.log("getConfirmedGateways..gateway = ", gateway);
        console.log("gateway.fanList.length=", gateway.fanList.length);

        //var gwStatus = await getAllFanStatusInGateway(macAddress);
        getAllFanStatusInGateway(macAddress);
        //await sleep(1000); // 2초 대기
    }
    //await sleep(2000); // 2초 대기
    var res = getConfirmedGatewaysInfo();
    return res
}

export async function getConfirmedGatewaysInfo(){
    var gatewayList = gatewayManager.getConfirmedGateways();
    var result = [];
    for( var gateway of gatewayList){

        for(var fan of gateway.fanList){
            fan.printInfo()
            //console.log(fan)
        }
        
        result.push(gateway);
    }

    return result;

}


// 팬 예약 기능
export async function createFanSchedule(house_id, gate_id, fan_id, reqData) {

    try {
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
        const {
            play_req: { isPlaying, speed_level, dir },
            date_req: { days, time, repeat }
          } = reqData;
        const [hour, minute] = time.split(':').map(t => Number(t));

        const onoffInfo = { gate_id, fan_id, isPlaying, speed_level, dir };
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
                gate_id: gate_id,
                fan_id: fan_id,
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
            cronExpressions.map(expr => fanSchedule(house.name, user_id, reservation.id, fan_id, expr, onoffInfo))
        );

        return { status: 'success', message: '팬 가동 예약이 등록되었습니다.'};
    } catch (error) {
        console.log(`[ERROR] :: ${error}`)
    }
}