import express from 'express';
import * as ceilingFanControlController from "../controllers/realFanControlController.js";
// import { messageHandler } from "../repositories/realFanControlRepository.js";
const router = express.Router();

// router.post('/register/gate', messageHandler); // 게이트 임시등록
router.post('/play', ceilingFanControlController.fanOnOff); // 팬 온오프
router.post('/rotationState', ceilingFanControlController.rotateState);
router.post('/speedControl', ceilingFanControlController.speedControl);
router.get('/fanCheck/:gwId/:fanId', ceilingFanControlController.fanCheck); // 팬상태 체크

router.get('/fanInfo/:gwId/:fanId', ceilingFanControlController.fanInfo); // 팬정보, 팬상태 조회
router.get('/rpm/:gwId/:fanId', ceilingFanControlController.getRpm); // rpm 조회

router.get('/gatewayStatus/:macAddr', ceilingFanControlController.getGatewayStatus); // ** 모든팬 정보(상태) 받아오기

router.get('/gatewayStatusById/:gwId', ceilingFanControlController.getGatewayStatusById);
router.get('/removeGateway/:gwId', ceilingFanControlController.removeGateway);
router.get('/removeAllGateways', ceilingFanControlController.removeAllGateways);
router.get('/resetGateway/:gwId', ceilingFanControlController.resetGateway); 

//all play 추가해야함. 
router.post('/playAll', ceilingFanControlController.fanAllOnOff); // 팬 온오프
router.get('/allGateways', ceilingFanControlController.getGatewayList); //전체 게이트웨이 얻어오기
router.post('/fanName', ceilingFanControlController.setFanName);


//250313 추가: 게이트웨이 등록시에 사용하는 API 
router.get('/initFansInfo/:macAddr', ceilingFanControlController.getInitFanInfo);//처음 게이트웨이 추가시 팬정보 얻어올때 호출함.
router.post('/confirmGateway', ceilingFanControlController.setConfirmGateway); //게이트웨이 등록할때, 게이트웨이의 팬이름까지 설정후, 서버에 전송함.
router.get('/unitCount/:macAddr', ceilingFanControlController.getUnitCount); //게이트웨이의 unit 갯수를 얻어옴. 
router.get('/confirmedGateway', ceilingFanControlController.getConfirmedGateways); // 등록된 게이트웨이 정보 얻어옴. 

router.get('/notConfirmedGateway', ceilingFanControlController.getNotConfirmedGateways);//사용안함. 등록안된 게이트웨이 정보 얻어옴. 


export default router;