import express from 'express';
import * as mainControlController from "../controllers/mainControl.controller.js";
//import * as ceilingFanControlController from "../controllers/fanControl.controller.js";

const router = express.Router();

// get 
router.get('/:house_id', mainControlController.getMainControl); // 통합제어 페이지 조회
router.get('/getFirstStatus/:house_id', mainControlController.getAllstatus); // 통합제어 첫로딩 조회
router.get('/getReservation/:house_id', mainControlController.getReservation); // 예약 목록 조회
router.post('/schedule/onoff/:house_id/:reservation_id', mainControlController.scheduleOnOff); // 예약 내역 토글버튼 팬 예약 취소
router.delete('/schedule/delete/:house_id', mainControlController.deleteSchedule); // 예약 내역 삭제

router.get('/get/schedule', mainControlController.getSchedule)

export default router;