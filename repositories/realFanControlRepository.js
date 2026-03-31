import express from 'express';
import dotenv from "dotenv";
dotenv.config();

import { SimpleConsoleLogger } from "typeorm";
import { time } from "console";
import client from '../mqtt_client_CF.js';
import { Gateway, GatewayManager } from '../realGatewayManager.js';
import { setFlagsFromString } from 'v8';

const MQTT_CMD_TYPE = ["sta", "unit", "all", "cnt"]; //sta:상태얻어오기, unit:개별제어, all:전체제어, cnt:unit count
const gatewayManager = new GatewayManager();

const app = express();
app.use(express.json());


// IoT 디바이스가 연결되었을 때 메시지 수신
// export function messageHandler(topic, message) {
//     let connectedClientMsg = message.toString();
//     console.log(`messageHandler:${topic}..${connectedClientMsg}`);
//     console.log("임시 팬등록");
//     saveFanStatus(topic, connectedClientMsg);
// }

// 리스너 등록
// client.on('message', messageHandler);

//새로운 mac address 인지 확인함. 
async function saveFanStatus(topic, msg){
    //{"type":"sta","unit_cnt":"02"}
    console.log("saveFanStatus..topic=", topic)
    console.log("saveFanStatus..msg=", msg)
    try{
        let parts = topic.split("/");
        let macAddr = parts[0];

        if(parts.length  > 1) {
            macAddr = parts[1];
        }
    

        // const staMsgJson = msg;
        const staMsgJson = JSON.parse(msg);
        console.log("staMsgJson = ", staMsgJson);

        if (staMsgJson.type === undefined ) {
            console.log("type이 존재하지 않습니다.");
            return false;
        }

        if (staMsgJson.type === "unit" && staMsgJson.motor_id !== "00" ) {
            console.log("type이 sta가 아닙니다.");
            
            var gateWay = gatewayManager.getGatewayByMacAddress(macAddr);
            if(gateWay=== null)
                return false;

            gateWay.setFanStatus(staMsgJson.motor_id, staMsgJson.rpm, staMsgJson.dir, staMsgJson.status)
            return true;
        }

        if (staMsgJson.unit_cnt == undefined){
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
        if(staMsg.type === "unit" && staMsg.motor_id !== "00");
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



function sendCFMessage(sub_topic, pub_topic, pub_message){

    return new Promise((resolve, reject) => {
        console.log("sendCFMessage=sub_topic:", sub_topic, "pub_topic=", pub_topic, "message=", pub_message)
        //client.subscribe(`FANZIC_CF/1C:69:20:CE:F5:B0/dat`, (err) => {
        client.subscribe(sub_topic, (err) => {
            if(err){
                reject(new Error('Subscription error.'));
                return;
            }

            //let pubMsg = '{"type":"sta","motor_id":"00","rpm":"","set":"","dir":""}'
            let pubMsg = pub_message;
            const pubMsgJson = JSON.parse(pubMsg);

            console.log("pubMsg = ", pubMsgJson); // { type: 'sta', motor_id: '02', rpm: '', set: '', dir: '' }
            //client.publish("FANZIC_CF/1C:69:20:CE:F5:B0/set", pubMsg, () => {
            client.publish(pub_topic, pubMsg, () => {
                    console.log("mqtt publish..topic=", pub_topic, " msg=", pubMsg)
            });
                
            let isResponseSent = false;
            // 타임아웃을 설정하여 응답이 오지 않는 경우 처리
            console.log("timout 들어가기 전");
            const timeout = setTimeout(() => {
                if (!isResponseSent) {
                    isResponseSent = true;
                    console.log("isRes = ", isResponseSent);
                    client.removeListener('message', runMessageHandler);
                    reject(new Error('Timeout waiting for MQTT message.'));
                    return;
                }
            }, 6000);  // 5초 타임아웃

            console.log("timout 들어간 후");
                // 메시지 수신 처리
            let msgList = [];
            let timer = null;

            const runMessageHandler = (topic, message) => {
                console.log("runMHl 시작");
                let connectedClientMsg = message.toString();
                isResponseSent = true;
                //console.log("mqtt runMessageHandler..topic=",topic, " msg=", connectedClientMsg);

                const escapedMsg = escapeJsonString(connectedClientMsg);
                const staMsg = JSON.parse(escapedMsg);

                // console.log("pubMJ = ", pubMsgJson);
                // console.log("staMsg = ", staMsg); // staMsg =  { type: 'sta', motor_id: '00', rpm: '', set: '', dir: '' }
                // console.log("pubMJ.type = ", pubMsgJson.type);
                // console.log("staMsg.type = ", staMsg.type);
                
                if(pubMsgJson.type === "cnt"){
                    if((staMsg.type !== "sta") || (staMsg.unit_cnt === undefined) ){
                        //return;
                    }else{
                        msgList.push(staMsg)
                    }

                    console.log("if type=cnt, msgList = ", staMsg);
                // } else if((staMsg.type === pubMsgJson.type) && (staMsg.motor_id === pubMsgJson.motor_id)){
                //         msgList.push(staMsg)
                //         console.log("if type=pubMsgJson, msgList = ", staMsg);
                //         //return false;
                // }
                } else if((staMsg.type === 'unit' && pubMsgJson.type === 'sta') && (staMsg.motor_id === pubMsgJson.motor_id)){
                    msgList.push(staMsg)
                    //return false;
                } else if((staMsg.type === 'unit' && pubMsgJson.type === 'unit') && (staMsg.motor_id === pubMsgJson.motor_id)){
                    msgList.push(staMsg)
                    //return false;
                }

                console.log("msgList=", msgList);
                console.log("msgList.length=", msgList.length);
                if(msgList.length === 1){
                    
                    isResponseSent = true;
                    client.removeListener('message', runMessageHandler);
                    //resolve({ topic:topic, message: msgList });
                    resolve({ message: msgList });
                    return;

                } 

            };

                // 메시지 리스너 등록
            client.on('message', runMessageHandler);

        });
    });
}

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
async function getAllFanStatusInGateway(macAddr){

    try{
        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_all_status();

        var res = await sendCFMessage(sub_topic, pub_topic, pub_message);
        console.log("getAllFanStatusInGateway..res=", res);
    } catch(error){
        console.log('error: getAllFanStatusInGateway '+error)
        return null;
    }
    return res;
}


//개별팬 ON
async function setFanOn(macAddr, mortorId, rpm, dir){
    try{
        var sub_topic = getSubscribeTopic(macAddr);
        var pub_topic = getPublishTopic(macAddr);
        var pub_message = getPublishMessage_control(mortorId, rpm, "ON", "00");

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
        var pub_message = getPublishMessage_control(mortorId, "100", "OFF", "00");

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
    const gateway_id = gwId;
    const fan_id =fanId;
    const gateway = gatewayManager.getGatewayInfoById(Number(gateway_id));
    if(gateway){
        var msgRes = await getFanStatus(gateway.macAddress, fanId);

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

    console.log("fanOnOff..info=", info);
    const gatewayId = info.gatewayId;
    const fanId = info.fanId;
    const isPlaying = info.isPlaying;

    console.log("info.rpm = ", info.rpm);

    const rpm  = Number(info.rpm) || 100;
    const formattedRpm = String(rpm).padStart(3, '0'); // "030"
    //console.log(formattedRpm);

    const dir = info.dir || "00";

    const gateway = gatewayManager.getGatewayInfoById(Number(gatewayId));

    if(gateway){
        if(isPlaying === "ON"){
            var msgRes = await setFanOn(gateway.macAddress, fanId, formattedRpm, dir);
            //resolve({ result: msgRes });
            gateway.setFanStatus(fanId, formattedRpm, dir, "ON");
            
            return { result: msgRes };
        }else{
            var msgRes = await setFanOff(gateway.macAddress, fanId);
            gateway.setFanStatus(fanId, formattedRpm, dir, "OFF");
            //resolve({ result: msgRes });
            return { result: msgRes };
        }
        
    }else {
        //reject({ error: 'fanOnOff error' });
        return { result: 'fanOnOff error' };
    }
}

export async function fanRotate(info) {
    console.log("fanRotate..info=", info);
    const gatewayId = info.gatewayId;
    const fanId = info.fanId;
    const dir = info.dir ;
    if(info.dir === undefined){
        return { error: 'fanRotate parameter error' };
    }else if(info.dir !== "00" && info.dir !== "01"){
        return { error: 'fanRotate dir error' };
    }

    const rpm  = Number(info.rpm) || 100;    
    const formattedRpm = String(rpm).padStart(3, '0'); // "030"
    //console.log(formattedRpm);

    const gateway = gatewayManager.getGatewayInfoById(Number(gatewayId));
    if(gateway){
        var msgRes = await setFanOn(gateway.macAddress, fanId, formattedRpm, dir);
        gateway.setFanStatus(fanId, formattedRpm, dir, "ON");

        return { result: msgRes };
    }else {
        return { error: 'fanRotate error' };
    }

}

export async function speedControl(info) {
    console.log("speedControl..info=", info);
    const gatewayId = info.gatewayId;
    const fanId = info.fanId;

    if(info.rpm === undefined){
        return { error: 'speedControl rpm parameter error' };
    }else if(Number(info.rpm) < 30 || Number(info.rpm) > 100){
        return { error: 'speedControl rpm out of range(30~100) error' };
    }

    const rpm = Number(info.rpm);
    const formattedRpm = String(rpm).padStart(3, '0'); // "030"
    //console.log(formattedRpm);

    const dir = info.dir || "00";
    const gateway = gatewayManager.getGatewayInfoById(Number(gatewayId));
    if(gateway){
        var msgRes = await setFanOn(gateway.macAddress, fanId, formattedRpm, dir);
        gateway.setFanStatus(fanId, formattedRpm, dir, "ON");

        return { result: msgRes };
    }else {
        return { error: 'speedControl error' };
    }
}


export async function getRpm(gwId, fanId) {
    console.log("getRpm..gwId, fanId=", gwId, fanId);
    const gateway_id = gwId;
    const fan_id = fanId;

    const gateway = gatewayManager.getGatewayInfoById(Number(gateway_id));
    if(gateway){
        try{
            var msgRes = await getFanStatus(gateway.macAddress, fanId);
            console.log("msgRes = ", msgRes);
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
        return [{"gateway":gateway}, {"fan":fan}] ;

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
            var msgRes = gateway.setConfirm(bConfirm)
            for(var fan of fanList){
                console.log("fan=", fan);
                gateway.setFanName(fan.id, fan.name)
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