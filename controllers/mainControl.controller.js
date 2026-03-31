import * as mainControlRepo from '../repositories/mainControl.repository.js';
import { sleep } from '../utils/sleep.js';

// 게이트리스트 조회
export async function getMainControl(req, res) {
    try {
        console.log("getMainControl 호출");
        const house_id = req.params.house_id;

        await sleep(100);
        const result = await mainControlRepo.getMainControl(house_id);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 게이트의 모든 팬 상태 조회
export async function getAllstatus(req, res) {
    try {
        console.log("getAllstatus 호출");
        const house_id = req.params.house_id;

        const result = await mainControlRepo.getAllstatus(house_id);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 게이트리스트 조회
export async function groupPlay(req, res) {
    try {
        console.log("groupPlay 호출");
        const reqData = req.body;

        const result = await mainControlRepo.groupPlay(reqData);

        console.log(result);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 예약리스트 조회
export async function getReservation(req, res) {
    try {
        console.log("getReservation 호출");
        const house_id = req.params.house_id;

        const result = await mainControlRepo.getReservation(house_id);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 팬 예약 온오프
export async function scheduleOnOff(req, res) {
    try {
        console.log("scheduleOnOff 호출");
        console.log(`** 요청 URL ====> ${req.method} ${req.originalUrl}`)
        const house_id = req.params.house_id;
        const reservation_id = req.params.reservation_id;
        const kind = req.body.kind;
        const active_flag = req.body.active_flag;

        console.log("house_id, reservation_id, kind, active_flag == ", house_id, reservation_id, kind, active_flag);

        const result = await mainControlRepo.scheduleOnOff(house_id, reservation_id, kind, active_flag);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 팬 예약 취소
export async function deleteSchedule(req, res) {
    try {
        console.log("deleteSchedule 호출");
        const house_id = req.params.house_id;
        const reservation_list = req.body.reservation_list;

        console.log("house_id, fan_id, kind == ", house_id, reservation_list);

        const result = await mainControlRepo.deleteSchedule(house_id, reservation_list);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// schedule 리스트 보기
export async function getSchedule(req, res) {
    try {
        console.log("getSchedule 호출");
        
        
        const group_id = req.params.group_id

        const result = await mainControlRepo.getSchedule();
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}