import * as houseRepo from '../repositories/house.repository.js';

// 하우스 생성
export async function createHouse(req, res) {
    try {
        console.log("House register");
        console.log("req body = ", req.body);
        
        // Data = {
        //     houseId: 1,
        //     name: '그룹1'
        // }
        const houseData = req.body;
        
        const result = await houseRepo.createHouse(houseData);
        console.log("Create House");

        res.json(result);

    } catch(error){
        console.log(error);
    }

}


// // 그룹 이름 수정
// export async function updateGroup(req, res) {
//     try {
//         console.log("updateGroup 요청");
        
//         const result = await groupRepository.updateGroup();
        

//         res.json(result);
//     } catch (error) {
//         console.log(error);
//     }
// }


// 하우스 조회
export async function getHouseList(req, res) {
    try {
        console.log("gethouseList 호출");
        const user_id = req.params.user_id;

        const result = await houseRepo.getHouseList(user_id);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 하우스 순서변경
export async function updateHouseOrder(req, res) {
    try {
        console.log("updateHouseOrder 호출");
        const user_id = req.params.user_id;
        const reqData = req.body;
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
        console.log("요청 데이터 =", reqData);

        const updatedHouseOrder = await houseRepo.updateHouseOrder(user_id, reqData);
        console.log("수정된  =", updatedHouseOrder);
        
        res.json(updatedHouseOrder);
    } catch (error) {
        console.log(error);
    }
}

// 하우스 정보 조회
export async function getHouseInfo(req, res) {
    try {
        // const newHouse = houseRepository.create(info);
        // const saveHouse = await houseRepository.save(newHouse);
        // console.log("House has been saved: ", saveHouse);

        console.log("getHouseInfo 호출");
        const house_id = req.params.house_id;
        
        const result = await houseRepo.getHouseInfo(house_id);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }   
}

// 하우스 순서변경
export async function updateName(req, res) {
    try {
        console.log("updateHouseName 호출");
        const house_id = req.params.house_id;
        const name = req.body.name;

        const result = await houseRepo.updateName(house_id, name);
    
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 하우스 삭제
export async function deleteHouse(req, res) {
    try {
        console.log("deleteHouse 호출");
        const house_id = req.params.house_id;

        const result = await houseRepo.deleteHouse(house_id);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}