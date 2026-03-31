import express from 'express';
import * as gateController from "../controllers/gate.controller.js";
//import * as ceilingFanControlController from "../controllers/fanControl.controller.js";

const router = express.Router();

// post
router.post('/', gateController.createGate); // 게이트 등록
router.post('/update/name/:gate_id', gateController.updateName); // 게이트 이름 변경
router.post('/delete/:gate_id', gateController.deleteGate); // 게이트 삭제

// get
router.get('/status/:gate_id', gateController.getGateStatus); //게이트 상태
router.get('/fanList/:mac_adr', gateController.getFanList); // 게이트 등록 전 팬리스트 조회
router.get('/checkName/:house_id/:name', gateController.checkName); // 게이트 이름 중복 조회
router.get('/gateList/:house_id', gateController.getGateList); // 게이트 조회
router.get('/detailInfo/:house_id/:gate_id', gateController.getDetailGateInfo); // 게이트 상세조회

export default router;