import * as userRepo from '../repositories/user.repository.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 유저 등록
export async function createUser(req, res) {
    try {

    } catch(error) {
        console.error("유저 생성 중 오류 발생 =", error);
        res.status(500).json({})

    }
}