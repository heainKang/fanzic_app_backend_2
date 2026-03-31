import express from 'express';
import * as fanControlController from "../controllers/fanControl.controller.js";
import { roundToNearestHours } from 'date-fns';

const router = express.Router();

router.post('/play', fanControlController.fanOnOff); // 팬 온오프
router.post('/change/rotation', fanControlController.rotateState); // 팬 회전 변경
router.post('/change/speed', fanControlController.speedControl); // 팬 속도 변경
router.get('/fanCheck/:gwId/:fanId', fanControlController.fanCheck); // 팬상태 체크
router.get('/rpm/:gwId/:fanId', fanControlController.getRpm); // rpm 조회
router.post('/create/schedule/:house_id/:gate_id/:fan_id', fanControlController.createFanSchedule); // 팬 예약 기능

// router.get('/gatewayStatus/:macAddr', ceilingFanControlController.getGatewayStatus);
// router.get('/gatewayStatusById/:gwId', ceilingFanControlController.getGatewayStatusById);
// router.get('/removeGateway/:gwId', ceilingFanControlController.removeGateway);
// router.get('/removeAllGateways', ceilingFanControlController.removeAllGateways);
// router.get('/resetGateway/:gwId', ceilingFanControlController.resetGateway);

// router.get('/allGateways', ceilingFanControlController.getGatewayList); //전체 게이트웨이 얻어오기


export default router;