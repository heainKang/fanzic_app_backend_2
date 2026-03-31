import { SimpleConsoleLogger } from 'typeorm';
import * as groupRepository from '../repositories/group.repository.js';
import { group } from 'console';

// 그룹 생성
export async function createGroup(req, res) {
    try {
        console.log("Group register");
        console.log("req body = ", req.body);
        
        // groupData = {
        //     houseId: 1,
        //     name: '그룹1'
        // }
        const groupData = req.body;
        
        const result = await groupRepository.createGroup(groupData);
        console.log("Create Group");

        res.json(result);

    } catch(error){
        console.log(error);
    }

}


// 그룹 이름 수정
export async function updateGroupName(req, res) {
    try {
        console.log("updateGroupName 요청");
        const house_id = req.params.house_id;
        const group_id = req.params.group_id;
        // reqData = {
        //     newName
        // }
        const reqData = req.body;
        const result = await groupRepository.updateGroupName(house_id, group_id, reqData);

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 그룹리스트 조회
export async function getGroupList(req, res) {
    try {
        console.log("getGroupList 호출");
        const house_id = req.params.house_id;

        const result = await groupRepository.getGroupList(house_id);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 그룹 상세조회
export async function getDetailGroupInfo(req, res) {
    try {
        console.log("getDetailGroupInfo");
        const house_id = req.params.house_id;
        const group_id = req.params.group_id;

        console.log("house_id, group_id = ", house_id, group_id);

        const result = await groupRepository.getDetailGroupInfo(house_id, group_id);
        console.log(result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 현재 그룹으로 팬 가져오기
export async function moveFanGroup(req, res) {
    try {
        console.log("moveFanGroup 호출");
        const house_id = req.params.house_id;
        const group_id = req.params.group_id;

        const reqData = req.body.fan_list;
        // reqData = {
        //     fanList: [1, 3, 4, 10]
        // }
        const result = await groupRepository.moveFanGroup(house_id, group_id, reqData);
        console.log(result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
};

// 현재 그룹에서 팬 내보내기
export async function removeFans(req, res) {
    try {
        console.log("removeFans 호출");
        const house_id = req.params.house_id;
        const group_id = req.params.group_id;

        const reqData = req.body
        // reqData = {
        //     moveGroup_id : 1 or null
        //     fanList: [1, 3, 4, 10]
        // }
        const result = await groupRepository.removeFans(house_id, group_id, reqData);
        console.log(result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
};

// 그룹 플레이
export async function groupOnOff(req, res) {
    try {
        console.log("groupOnOff1 호출");
        const reqData = req.body;
        // reqData = {
        //     group_id,
        //     isPlaying
        // }
        console.log("reqData == ", reqData);

        const result = await groupRepository.groupOnOff(reqData);
        console.log(result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
};

// 그룹 속도 변경
export async function speedControl(req, res) {
    try { 
        console.log("group speedControl 호출");
        const reqData = req.body;
        // reqData = {
        //     group_id,
        //     speed_level
        // }
        const result = await groupRepository.groupSpeedControl(reqData);
        console.log(result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
};

// 그룹 순서 변경
export async function updateGroupOrder(req, res) {
    try { 
        console.log("updateGroupOrder 호출");
        const house_id = req.params.house_id;
        const reqData = req.body;
        // reqData = [
        //     {
        //         idx: 1
        //         group_id: 1
        //     },
        //     {
        //         idx: 2
        //         group_id: 2
        //     }
        // ]
        console.log("reqData == ", reqData);
        
        const result = await groupRepository.updateGroupOrder(house_id, reqData); 
        res.json(result);
    } catch (error) {
        console.log(error);
    }
};

// 그룹 삭제
export async function deleteGroup(req, res) {
    try { 
        console.log("deleteGroup 호출");
        const house_id = req.params.house_id;
        const group_id = req.params.group_id;
        
        const result = await groupRepository.deleteGroup(house_id, group_id);
        
        console.log(result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
};


// 그룹 예약 기능
export async function createGroupSchedule(req, res) {
    try { 
        console.log("group_createSchedule 호출");
        const house_id = req.params.house_id;
        const group_id = req.params.group_id;
        const reqData = req.body;
        // reqData = {
        //     play_req = {
        //      isPlaying,
        //      speed_level,
        //      dir
        //     },
        //     date_req = {
        //      day
        //      time
        //      repeat
        //     }
        // }

        console.log("reqData == ", reqData);
        
        const result = await groupRepository.createGroupSchedule(house_id, group_id, reqData);
        
        console.log(result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
};
