import express from 'express';
import * as houseController from "../controllers/house.controller.js";

const router = express.Router();


router.post('/', houseController.createHouse); // 하우스 등록
router.get('/houseList/:user_id', houseController.getHouseList); // 하우스 리스트 조회
router.post('/update/ordering/:user_id', houseController.updateHouseOrder); // 하우스 순서 변경
router.get('/houseInfo/:house_id', houseController.getHouseInfo); // 하우스 정보 조회
router.post('/update/name/:house_id', houseController.updateName); // 하우스 이름 변경
router.post('/delete/:house_id', houseController.deleteHouse); // 하우스 삭제

export default router;