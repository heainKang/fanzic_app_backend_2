import * as fanControlRepo from '../repositories/fanControl.repository.js';


// 팬 작동/정지
export async function fanOnOff(req, res) {
    try {
        console.log("fanOnOff 호출");
        console.log(req.body);
        // info = {
        //     gate_id,
        //     fan_id,
        //     isPlaying,
        //     SPDHi,
        //     dir
        // }
        const info = req.body;
        const result = await fanControlRepo.fanOnOff(info);

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 팬정보 조회
export async function fanInfo(req, res) {
    try {
        const gwId = req.params.gwId;
        const fanId = req.params.fanId;
        console.log("gwId =", gwId, "fanId=", fanId);
        const result = await fanControlRepo.fanInfo(gwId, fanId);
        console.log("팬정보 = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 팬 rpm 조회
export async function getRpm(req, res) {
    try {
        console.log("rpm 조회")
        const gwId = req.params.gwId;
        const fanId = req.params.fanId;
        console.log("gwId =", gwId, "fanId=", fanId);
        const result = await fanControlRepo.getRpm(gwId, fanId);
        console.log("getRpm = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 브로커서버 팬 정보 조회
export async function fanCheck(req, res) {
    try {
        console.log("팬 정보 조회");
        const gwId = req.params.gwId;
        const fanId = req.params.fanId;
        console.log("gwId =", gwId, "fanId=", fanId);
        // req.body에 필요한것
        // 팬이름, 팬위치(하우스), 팬그룹, wifi, ip주소, mac주소, 모델, 펌웨어
        const result = await fanControlRepo.fanCheck(gwId, fanId);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 팬 회전제어
export async function rotateState(req, res) {
    try {
        console.log("팬 회전 온오프");
        const info = req.body;
        console.log(req.body);
        const result = await fanControlRepo.fanRotate(info);

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 팬 풍속변경
export async function speedControl(req, res) {
    try {
        console.log("팬 속도 변경");
        const info = req.body;
        console.log("req_info == ", req.body);
        const result = await fanControlRepo.speedControl(info);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 팬 예약 기능
export async function createFanSchedule(req, res) {
    try {
        console.log("createSchedule 호출");
        const house_id = req.params.house_id;
        const gate_id = req.params.gate_id;
        const fan_id = req.params.fan_id;
        const reqData = req.body;
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

        console.log("reqData == ", reqData);

        const result = await fanControlRepo.createFanSchedule(house_id, gate_id, fan_id, reqData);

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}
