import * as gateRepository from '../repositories/gate.repository.js';
import * as ceilingFanControlRepository from '../repositories/fanControl.repository.js';

// 게이트리스트 조회
export async function getGateList(req, res) {
    try {
        console.log("getGatewayList 호출");
        const house_id = req.params.house_id;

        const result = await gateRepository.getGatewayList(house_id);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 게이트웨이 상태 가져오기
export async function getGateStatus(req, res) {
    try {
        console.log("getGateStatus");
        
        const gateId= req.params.gate_id;

        const result = await gateRepository.getGateStatus(gateId);
        
        console.log("gateStatus = ", result);
        res.json(result);

    } catch (error) {
        console.log(error);
    }
}

// 게이트웨이 등록
export async function createGate(req, res) {
    try {
        console.log("createGate 호출");
        
        const gateData = req.body;
        // gateData = {
        //     gateSSID,
        //     MAC주소(mac_adr),
        //     공유기선택(wifi_name),
        //     공유기암호,
        //     게이트이름(gate_name),
        //     fanList
        // }
        console.log("gateData = ", gateData);

        const result = await gateRepository.createGate(gateData);
        
        console.log("result = ", result);
        res.json(result);

    } catch (error) {
        console.log(error);
    }
}

// 게이트웨이 등록 전 팬리스트 가져오기
export async function getFanList(req, res) {
    try {
        console.log("getFanList 호출");
        
        // const mac_adr = req.params.mac_adr;
        // console.log("mac =", mac_adr);

        const rawMac = req.params.mac_adr;
        console.log("raw mac =", rawMac);
        const mac_adr = rawMac.toUpperCase();

        // 12자리로 맞추기 위해 앞에 0을 추가 (필요한 경우)
        const macPad = mac_adr.padStart(12, '0');
        const macAddr = macPad.match(/.{1,2}/g).join(':');

        console.log("macAddr = ", macAddr);

        //const result = await ceilingFanControlRepository.getInitFanInfoInGateway(macAddr);
        const result = await gateRepository.getInitFanInfoInGateway(macAddr);

        if (!result) {
            return {status: "fail", message: "gate not found"};
        }

        res.json(result);

    } catch (error) {
        console.log(error);
    }
}

// 게이트웨이 이름 중복조회
export async function checkName(req, res) {
    try {
        console.log("checkName 호출");
        
        const house_id = req.params.house_id;
        const name = req.params.name;

        // // 12자리로 맞추기 위해 앞에 0을 추가 (필요한 경우)
        // const macPad = mac_adr.padStart(12, '0');
        // const macAddr = macPad.match(/.{1,2}/g).join(':');

        // console.log("macAddr = ", macAddr);

        //const result = await ceilingFanControlRepository.getInitFanInfoInGateway(macAddr);
        const result = await gateRepository.checkName(house_id, name);
        
        res.json(result);

    } catch (error) {
        console.log(error);
    }
}

// 게이트리스트 조회
export async function getDetailGateInfo(req, res) {
    try {
        console.log("detailGateInfo 호출");
        const house_id = req.params.house_id;
        const gate_id = req.params.gate_id;
        
        const result = await gateRepository.getDetailGateInfo(house_id, gate_id);

        console.log(result);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


// 게이트리스트 조회
export async function updateName(req, res) {
    try {
        console.log("updateName");
        const gate_id = req.params.gate_id;
        const name = req.body.name;

        const result = await gateRepository.updateName(gate_id, name);

        console.log(result);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 게이트리스트 조회
export async function deleteGate(req, res) {
    try {
        console.log("deleteGate 호출");
        const gate_id = req.params.gate_id;

        const result = await gateRepository.deleteGate(gate_id);

        console.log(result);
        
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}
