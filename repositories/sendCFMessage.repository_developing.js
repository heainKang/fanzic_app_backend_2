import { measureMemory } from 'vm';
import client from '../mqtt_client_CF.js';

export async function sendCFMessage(sub_topic, pub_topic, pub_message){
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

            //client.publish("FANZIC_CF/1C:69:20:CE:F5:B0/set", pubMsg, () => {
            client.publish(pub_topic, pubMsg, () => {
                    console.log("mqtt publish..topic=",pub_topic, " msg=", pubMsg)
            });
                
            let isResponseSent = false;
            // 타임아웃을 설정하여 응답이 오지 않는 경우 처리

            console.log("timout 들어가기 전");

            const timeout = setTimeout(() => {
                if (!isResponseSent) {
                    isResponseSent = true;
                    client.removeListener('message', runMessageHandler);
                    reject(new Error('Timeout waiting for MQTT message.'));
                    return;
                }
            }, 4000);  // 5초 타임아웃

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
                console.log("stgMsg, pubMsgJson == ", staMsg, pubMsgJson);

                if (staMsg.type === "unit" || staMsg.type === "all") {
                    if((pubMsgJson.motor_id === "00") || (staMsg.motor_id === pubMsgJson.motor_id)){
                        msgList.push(staMsg);
                        //return false;
                    }
                };

                console.log("AllMsgList == ", msgList);

                // if(pubMsgJson.type === "cnt"){
                //     if((staMsg.type !== "sta") || (staMsg.unit_cnt === undefined) ){
                //         //return;
                //     }else{
                //         console.log("여기?????");

                //         console.log(staMsg.unit_cnt);
                //         msgList.push(staMsg);
                //     }
                // }
        
                if(pubMsgJson.type === "cnt"){
                    if((staMsg.type !== "sta") || (staMsg.unit_cnt === undefined) ){
                        //return;
                    }else{
                        console.log("여기?????")
                        msgList.push(staMsg)
                    }

                    // } else if((staMsg.type !== pubMsgJson.type) && (staMsg.motor_id === pubMsgJson.motor_id)){
                    //         msgList.push(staMsg)
                    //         //return false;
                    // }
                 } else if((staMsg.type === 'unit' && pubMsgJson.type === 'sta') && (staMsg.motor_id === pubMsgJson.motor_id)){
                    msgList.push(staMsg)
                    //return false;
                 } else if((staMsg.type === 'unit' && pubMsgJson.type === 'unit') && (staMsg.motor_id === pubMsgJson.motor_id)){
                    msgList.push(staMsg)
                    //return false;
                 } else if((staMsg.type === 'unit' && pubMsgJson.type === 'sta') && (pubMsgJson.motor_id === "00")){
                    msgList.push(staMsg)
                    //return false;
                 }

                console.log("msgList=", msgList);
                console.log("msgList.length=", msgList.length);
                if(msgList.length === 0){
                    // isResponseSent = true;
                    // client.removeListener('message', runMessageHandler);
                    // //resolve({ topic:topic, message: msgList });
                    // resolve({ message: msgList });
                    // return;
                    return;
                } else {
                    isResponseSent = true;
                    client.removeListener('message', runMessageHandler);
                    //resolve({ topic:topic, message: msgList });

                    console.log({ message: msgList });
                    resolve({ message: msgList });
                
                    console.log("resolve하고 돌아?")
                    return;
                }

                console.log("끝인가?")
            
            
            };
            // 메시지 리스너 등록
            client.on('message', runMessageHandler);
        });
    });
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