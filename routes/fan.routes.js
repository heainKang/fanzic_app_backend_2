import express from 'express';
import * as fanController from "../controllers/fan.controller.js";

const router = express.Router();

// get
router.get('/list/:house_id', fanController.getFanList) // 팬리스트 조회
router.get('/info/:house_id/:fan_id', fanController.getFanInfo) // 팬정보 조회
router.get('/detailInfo/:house_id/:fan_id', fanController.getDetailFanInfo) // 팬 상세정보 조회

// post
router.post('/update/name/:fan_idx', fanController.updateName); // 팬 이름 변경
router.post('/move/group/:house_id/:fan_id', fanController.moveGroup); // 팬을 그룹에서 빼기

export default router;