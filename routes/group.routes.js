import express from 'express';
import * as groupController from "../controllers/group.controller.js";
import { group } from 'console';
//import * as ceilingFanControlController from "../controllers/fanControl.controller.js";

const router = express.Router();

// post
router.post('/', groupController.createGroup); // 그룹 등록
router.post('/play', groupController.groupOnOff); // 그룹 플레이
router.post('/change/speed', groupController.speedControl); // 그룹 속도 변경
router.post('/move/fan/:house_id/:group_id', groupController.moveFanGroup); // 팬을 그룹으로 이동
router.post('/remove/fan/:house_id/:group_id', groupController.removeFans); // 현재 그룹에서 팬 내보내기
router.post('/update/ordering/:house_id/', groupController.updateGroupOrder); // 그룹 순서 변경
router.post('/create/schedule/:house_id/:group_id', groupController.createGroupSchedule); // 그룹 예약 기능 

// get
router.get('/groupList/:house_id', groupController.getGroupList); // 그룹 리스트 조회
router.get('/detailInfo/:house_id/:group_id', groupController.getDetailGroupInfo); // 그룹 상세조회

// patch
router.patch('/update/name/:house_id/:group_id', groupController.updateGroupName); // 그룹 이름 수정
router.patch('/move/group/:house_id/:group_id', groupController.moveFanGroup); // 현재 그룹에 팬 가져오기


// delete
router.delete('/delete/:house_id/:group_id', groupController.deleteGroup); // 그룹 삭제


export default router;