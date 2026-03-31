import * as fanRepo from '../repositories/fan.repository.js';

// // 그룹 생성
// export async function createGroup(req, res) {
//     try {
//         console.log("Group register");
//         console.log("req body = ", req.body);
        
//         // groupData = {
//         //     houseId: 1,
//         //     name: '그룹1'
//         // }
//         const groupData = req.body;
        
//         const result = await groupRepository.createGroup(groupData);
//         console.log("Create Group");

//         res.json(result);

//     } catch(error){
//         console.log(error);
//     }

// }

//  팬리스트 조회
export async function getFanList(req, res) {
    try {
        console.log("getFanList 호출");
        const house_id = req.params.house_id;

        const result = await fanRepo.getFanList(house_id);
      
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


// 팬정보 조회
export async function getFanInfo(req, res) {
    try {
        console.log("getFanInfo 호출");
        const house_id = req.params.house_id;
        const fan_id = req.params.fan_id;
        
        const result = await fanRepo.getFanInfo(house_id, fan_id);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


// 팬정보 조회
export async function getDetailFanInfo(req, res) {
    try {
        console.log("getDetailInfo 호출");
        const house_id = req.params.house_id;
        const fan_id = req.params.fan_id;

        const result = await fanRepo.getDetailFanInfo(house_id, fan_id);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


// 팬 이름 수정
export async function updateName(req, res) {
    try {
        console.log("updateName 요청");
        const fan_id = req.params.fan_idx;

        const name = req.body.name;
        
        const result = await fanRepo.updateName(fan_id, name);
        

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 그룹에서 팬 빼기
export async function moveGroup(req, res) {
    try {
        console.log("removeGroup 요청");
        const fan_id = req.params.fan_id;
        const house_id = req.params.house_id;
        const moveGroup_id = req.body.moveGroup_id;
        
        const result = await fanRepo.moveGroup(house_id, fan_id, moveGroup_id);
        

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

