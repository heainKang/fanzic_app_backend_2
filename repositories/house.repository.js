import "reflect-metadata";
import { AppDataSource } from '../models/data-source.js';
import { Gate } from "../models/gate.js";
import { Fan } from "../models/fan.js";
import { House } from "../models/house.js";
import { Group } from "../models/group.js";
import { fanGroupMapping } from "../models/fan_group_mapping.js";
import { Gateway, GatewayManager } from '../realGatewayManager.js';
import { SimpleConsoleLogger } from "typeorm";
import { In } from 'typeorm';
import { Not } from 'typeorm';
import { group } from "console";

const gateRepository = AppDataSource.getRepository(Gate);
const fanRepository = AppDataSource.getRepository(Fan);
const houseRepository = AppDataSource.getRepository(House);
const groupRepository = AppDataSource.getRepository(Group);
const fanGroupMappingRepository = AppDataSource.getRepository(fanGroupMapping);


// 하우스 등록
export async function createHouse(houseData) {
    try {
        // const newHouse = houseRepository.create(info);
        // const saveHouse = await houseRepository.save(newHouse);
        // console.log("House has been saved: ", saveHouse);
        
        const existingHouse = await houseRepository.findOne({where : {user_id: houseData.user_id, name: houseData.name}});
        if (existingHouse) {
            return { status: 'error', message: '동명 하우스 존재'}
        }

        const newHouse = houseRepository.create({ user_id: houseData.user_id, name: houseData.name });
        const houses = await houseRepository.find();
        newHouse.ordering = houses.length + 1;        
        const saveHouse = await houseRepository.save(newHouse);
        console.log("House has been saved = ", saveHouse);

        return { status: 'success', message: '하우스 생성 완료', house: saveHouse };
    } catch (error) {
        console.log(error);
    }   
}

// 하우스 조회
export async function getHouseList(user_id) {
    try {
        // const newHouse = houseRepository.create(info);
        // const saveHouse = await houseRepository.save(newHouse);
        // console.log("House has been saved: ", saveHouse);

        const houses = await houseRepository.find({
            where: {user_id: user_id, deleted_flag: 0},
            order: {ordering: "ASC"}
        });
        console.log("houses = ", houses);
        
        const houseList = []
        for (const house of houses) {
            const gates = await gateRepository.find({where: {house_id: house.id, deleted_flag: 0}});
            console.log("gates = ", gates);

            const groupCount = await groupRepository.count({where: {house_id: house.id}});
            console.log("groupCount =", groupCount);

            let fanTotalCount = 0
            for (const gate of gates) {
                const fanCount = await fanRepository.count({where: {gate_id: gate.id}});
                fanTotalCount += fanCount
            }

            console.log("fanCount = ", fanTotalCount);
            const houseInfo = {
                house_id: house.id,
                house_name: house.name,
                group_count: groupCount,
                fan_count: fanTotalCount,
                house_ordering: house.ordering
            }

            houseList.push(houseInfo);
        }

        return { status: 'success', message: '하우스 조회 완료', house_list: houseList };

    } catch (error) {
        console.log(error);
    }   
}

// 하우스 순서 변경
export async function updateHouseOrder(user_id, reqData) {
    try {
        // reqData = [
        //     {
        //         idx: 1
        //         house_id: 1
        //     },
        //     {
        //         idx: 2
        //         house_id: 2
        //     }
        // ]

        for ( const data of reqData) {
            console.log("data =", data);
            const house = await houseRepository.findOne({
                where : { id: data.house_id }});
            house.ordering = data.idx;
            await houseRepository.save(house);
        }
      
        return { status: 'success', message: '하우스 순서 변경 완료' };
    } catch(error) {
        console.error("하우스 순서 변경 중 오류 발생 =", error);
        return { status: 'error', message: '하우스 순서 변경 중 오류 발생' };
    }   
}

// 하우스 정보 조회
export async function getHouseInfo(house_id) {
    try {
        // const newHouse = houseRepository.create(info);
        // const saveHouse = await houseRepository.save(newHouse);
        // console.log("House has been saved: ", saveHouse);

        const house = await houseRepository.findOne({where: {id: house_id}});
        console.log("houses = ", house);
        
        const gates = await gateRepository.find({where: {house_id: house.id, deleted_flag: 0}});
        console.log("gates = ", gates);

        const groupCount = await groupRepository.count({where: {house_id: house.id}});
        const groups = await groupRepository.find({where: {house_id: house.id}});


        let groupList = []
        for ( const group of groups) {
            const fanCount = await fanGroupMappingRepository.count({where: {group_id: group.id}});

            const groupInfo = {
                group_id: group.id,
                group_name: group.name,
                fan_count: fanCount
            }

            groupList.push(groupInfo);
        }
        console.log("groupCount =", groupCount);

        let fanTotalCount = 0
        for (const gate of gates) {
            const fanCount = await fanRepository.count({where: {gate_id: gate.id}});
            fanTotalCount += fanCount
        }

        console.log("fanCount = ", fanTotalCount);
        const houseInfo = {
            house_id: house.id,
            house_name: house.name,
            group_count: groupCount,
            fan_count: fanTotalCount,
            group_list: groupList
        }
       
        
        return { status: 'success', message: '하우스 조회 완료', house_info: houseInfo };

    } catch (error) {
        console.log(error);
    }   
}


// 하우스 이름 변경
export async function updateName(house_id, newName) {
    try {

        const house = await houseRepository.findOne({where: {id: house_id}});

        const duplicateCount = await houseRepository.count({
            where: {
            user_id: house.user_id,
            name: newName,
            id: Not(house_id),        // 자기 자신 제외
            }
        });
        if (duplicateCount > 0) {
            return { status: 'fail', message: '동명의 작업장이 있습니다.' };
        }
  
        
        await houseRepository.update(house_id, { name: newName });
    
        return { status: 'success', message: '작업장 이름 변경 완료' };

    } catch(error) {
        console.error("하우스 이름 변경 중 오류 발생 =", error);
        return { status: 'error', message: '하우스 이름 변경 중 오류 발생' };
    }   
}

// 하우스 삭제 처리
export async function deleteHouse(house_id) {
    try {
        const house = await houseRepository.findOne({where: {id: house_id}});

        const existingGates = await gateRepository.find({where: {house_id: house_id, deleted_flag: 0}});

        console.log(existingGates);
        
        if (existingGates.length > 0) {
            return { status: 'fail', message: '작업장에 게이트가 있습니다.' }
        }

        
        house.deleted_flag = 1;
        const saveHouse = await houseRepository.save(house);

        await groupRepository.delete({house_id: house_id});

        console.log("하우스 삭제처리 완료")
        return { status: 'success', message: '작업장 삭제 처리 완료' };
    } catch (error) {
        console.log(error);
    }   
}