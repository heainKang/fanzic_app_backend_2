import express from 'express';
import * as userController from "../controllers/user.controller.js";

const router = express.Router();

router.post('/', userController); // 유저 생성
router.post('/login', userController); // 유저로그인

// 비밀번호 초기화, 비밀번호 수정은 나중에