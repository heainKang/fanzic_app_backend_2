import { SimpleConsoleLogger } from 'typeorm';
import client from '../mqtt_client_CF.js';
import { sleep } from '../utils/sleep.js';

//MQTT 통신 개별 제어용 - 에러 분기  
export async function sendCFMessage(sub_topic, pub_topic, pub_message) {
    return new Promise((resolve, reject) => {
        console.log("들어온 값 sendCFMessage=sub_topic:", sub_topic, "pub_topic=", pub_topic, "message=", pub_message)
        
        //채널설정 "듣겠다" 구독선언
        //client.subscribe(`FANZIC_CF/1C:69:20:CE:F5:B0/dat`, (err) => { 
        client.subscribe(sub_topic, (err) => {

            if(err){
                reject(new Error('Subscription error.'));
                return;
            }

            //let pubMsg = '{"type":"sta","motor_id":"00","rpm":"","set":"","dir":""}'
            let pubMsg = pub_message; //보내는 메시지
            const pubMsgJson = JSON.parse(pubMsg);
            const originalMotorId = pubMsgJson.motor_id; // 요청한 motor_id 저장

            // publish 메시지 송신 "게이트야 팬 켜줘"
            // client.publish("FANZIC_CF/1C:69:20:CE:F5:B0/set", pubMsg, () => {
            client.publish(pub_topic, pubMsg, () => {
                    console.log(" 📤공통📤 들어온대로 mqtt 제어 명령 : mqtt publish..topic=",pub_topic, " msg=", pubMsg)
                });
                
            let isResponseSent = false; //최종응답 여부 true가 resolve/reject로 최종 완료됨
            
            let retryCount = 0;   //재시도 카운트                                                           
            const maxRetries = 1; //재시도는 1회
            let fallbackAttempted = false; // 전체 상태 조회 시도 여부
            
            //정상응답은 아웃

            console.log("⏰🟢0🟡0🔴0 4초 타임아웃 타이머 시작되고, 맨 아랫줄에 리스너 설정되서 시작함!!!!");
            const timeout = setTimeout(async () => {
                //!isResponseSent 아직 최종응답은 없고 여전히 false이면  개별이면 전체 상태 조회 
                if (!isResponseSent && pubMsgJson.type === "unit" && !fallbackAttempted) {
                    console.log("🟡1🔴1  개별 제어 타임아웃 - 전체 상태 조회로 대체");
                    fallbackAttempted = true;
                    
                    // 전체 상태 조회로 해당 팬 상태 확인
                    const allStatusMsg = `{"type":"sta","motor_id":"${originalMotorId}","rpm":"","set":"","dir":""}`;  
                    client.publish(pub_topic, allStatusMsg, () => {
                        console.log("🟡2🔴2  전체 상태 조회 publish..", allStatusMsg);
                    });
                    
                    // 전체 상태 조회에 대한 추가 타임아웃 설정 (3초 추가)
                    console.log("⏰🔴3 3초 추가 타임아웃 타이머 시작");
                    setTimeout(() => {
                        if (!isResponseSent) {
                            console.log("🔴4  전체 상태 조회도 타임아웃");
                            isResponseSent = true;
                            client.removeListener('message', runMessageHandler);
                            reject(new Error('=====Final timeout - no response from gateway'));
                        }
                    }, 3000);
                // 개별제어가 아니거나 이미 전체도 시도했는데 응답 없으면 타임아웃에러로 reject!
                } else if (!isResponseSent) {
                    isResponseSent = true;
                    client.removeListener('message', runMessageHandler);
                    reject(new Error('=====Timeout waiting for MQTT message.'));
                    return;
                }
            }, 4000);  // 4초 타임아웃 

            /*
            < sendCFMessage 함수 오류값에 대한 로직 >
            공통 이후 
            🟢 ON OFF 정상응답
            🟡 Er0  팬민 꺼짐(unit으로 물어보면 타임아웃) => 팬만 켜진 경우는 시간지나면 팬도 자동으로 꺼짐
            개별 - 개별(재시도) - 전체(sta) - 응답받음
            🔴 Er10 게이트,팬 모두 꺼져 타임아웃
            개별 - 개별(재시도) - 전체(sta) - 응답없음
            🔵 Er1 팬 통신 불량으로 추측 (재시도 성공 가능성 있음.)
            🔵 Er2 과부하 에러 이런것도 있을 수 있을거같은데 에러추측

            최대 소요 시간
            - 최선: 즉시 성공 (< 1초)
            - 재시도: 개별 제어 재시도 후 성공 (< 4초)
            - 전체 조회: 전체 상태에서 Er0 받음 (< 7초) 
            - Er0는 응답은 올테니 4-5초 Er10은 7초
            - 최악: Final timeout (7초)(4초 + 전체3초)

            */

            // 메시지 수신 처리
            let msgList = [];
            let timer = null;
            // 📤 게이트가 응답하면 탐
            const runMessageHandler = (topic, message) => {
                console.log("🟢1🟡3 runMH 돈다 - 게이트가 응답함 message값 있음");

                let connectedClientMsg = message.toString();
                // connectedClientMsg = {"type":"unit","motor_id":"01","group_id":"01","rpm":"000","SPDHi":"0100","SPDLo":"0015","dir":"00","status":"Er0"}
                const escapedMsg = escapeJsonString(connectedClientMsg);
                // escapedMsg :  {"type":"unit","motor_id":"01","group_id":"01","rpm":"000","SPDHi":"0100","SPDLo":"0015","dir":"00","status":"Er0"}
                const staMsg = JSON.parse(escapedMsg);//받는 메시지
                /*
                staMsg :  {
                            type: 'unit',
                            motor_id: '01',
                            group_id: '01',
                            rpm: '000',
                            SPDHi: '0100',
                            SPDLo: '0015',
                            dir: '00',
                            status: 'Er0'
                            }
                */



                // 에러 상태 처리: 한 번만 더 리스너 실행하도록 설정 (Er1, Er2 등 에러일시 한 번 더 실행 (테스트 불가))
                if (pubMsgJson.type === "unit" && staMsg.status && staMsg.status.startsWith('Er') && !fallbackAttempted) {
                    console.log(" 🔍 Status error 발생:", staMsg.status);
                    console.log(" 🔍 staMsg == ", staMsg);
                    
                    // 에러 상태 처리: 한 번만 더 리스너 실행하도록 설정
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(` 🔵 재시도 ${retryCount}/${maxRetries}`);
                        // isResponseSent를 false로 유지하여 타임아웃 가능하게 함
                        isResponseSent = false;
                        client.publish(pub_topic, pubMsg, () => {
                            console.log(" 🔵 재요청 publish..", pubMsg);
                        });
                        return; // 기존 on('message') 리스너 계속 유지
                    } else {
                        // 📤 재시도 후 전체 상태 조회로 시도
                        console.log(" 🔵 최대 재시도 횟수 초과 - 🔄 전체 상태 조회로 대체");
                        fallbackAttempted = true;
                        
                        const allStatusMsg = `{"type":"sta","motor_id":"${originalMotorId}","rpm":"","set":"","dir":""}`;  
                        client.publish(pub_topic, allStatusMsg, () => {
                            console.log("🔵 재시도 실패 후 전체 상태 조회 publish..", allStatusMsg);
                        });
                        return; //gate는 켜진상태라 대부분 응답은 나올듯함(Er0)
                    }
                }



                if(pubMsgJson.type === "cnt"){
                    if((staMsg.type !== "sta") || (staMsg.unit_cnt === undefined) ){
                        //return;
                    }else{
                        msgList.push(staMsg)
                    }
                } else if((staMsg.type === 'unit' && pubMsgJson.type === 'sta') && (staMsg.motor_id === pubMsgJson.motor_id)){
                    console.log("3")
                    console.log("staMsg == ", staMsg);
                    msgList.push(staMsg);
                    //return false;
                //첫시도 unit, 받을때도 unit(sta로 보냈어도 Er0일때는 unit으로 답함_motor_id를 지정유무는 확인필요)
                } else if((staMsg.type === 'unit' && pubMsgJson.type === 'unit') && (staMsg.motor_id === pubMsgJson.motor_id)){
                    console.log("🟢2🟡4")
                    console.log("staMsg == ", staMsg);
                    msgList.push(staMsg);
                    //return false;
                } else if(staMsg.type === 'unit' && staMsg.motor_id === originalMotorId) {
                    // 타임아웃 후 전체 상태 조회에서 원래 요청한 팬의 상태를 찾음
                    console.log("타임아웃 후 전체 상태에서 해당 팬 상태 찾음:", staMsg);
                    msgList.push(staMsg);
                }

                console.log("msgList=", msgList);
                console.log("msgList.length=", msgList.length);
                if(msgList.length === 1){
                    isResponseSent = true;
                    console.log("🟢3 isResponseSent 최종응답함 ");
                    clearTimeout(timeout); //최종 응답 받을 경우만 타임클리어함!
                    client.removeListener('message', runMessageHandler);
                    //resolve({ topic:topic, message: msgList });
                    resolve({ message: msgList });
                    return;
                }

            };

            //📤 메시지 리스너 등록! 응답대기기능. 게이트가 팬 켰어요! 하면 자동으로 받는 기능
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