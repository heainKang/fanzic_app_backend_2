import * as ceilingFanControlRepository from '../repositories/realFanControlRepository.js';

// 브로커서버 팬 정보 조회
export async function fanCheck(req, res) {
    try {
        console.log("팬 정보 조회");
        const gwId = req.params.gwId;
        const fanId = req.params.fanId;
        console.log("gwId =", gwId, "fanId=", fanId);
        // req.body에 필요한것
        // 팬이름, 팬위치(하우스), 팬그룹, wifi, ip주소, mac주소, 모델, 펌웨어
        const result = await ceilingFanControlRepository.fanCheck(gwId, fanId);
        console.log(result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


// 팬정보 조회
export async function fanInfo(req, res) {
    try {
        const gwId = req.params.gwId;
        const fanId = req.params.fanId;
        console.log("gwId =", gwId, "fanId=", fanId);
        const result = await ceilingFanControlRepository.fanInfo(gwId, fanId);
        console.log("팬정보 = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 팬 rpm 조회
export async function getRpm(req, res) {
    try {
        console.log("rpm 조회")
        const gwId = req.params.gwId;
        const fanId = req.params.fanId;
        console.log("gwId =", gwId, "fanId=", fanId);
        const result = await ceilingFanControlRepository.getRpm(gwId, fanId);
        console.log("getRpm = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

export async function getGatewayStatus(req, res) {
    try {
        console.log("getGatewayStatus 조회")
        const macAddr = req.params.macAddr;
        console.log("macAddr =", macAddr);
        const result = await ceilingFanControlRepository.getGatewayStatus(macAddr);
        console.log("getGatewayStatus = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

export async function getUnitCount(req, res) {
    try {
        console.log("getUnitCount 조회")
        const mac = req.params.macAddr;
        console.log("mac =", mac);

        // 12자리로 맞추기 위해 앞에 0을 추가 (필요한 경우)
        const macPad = mac.padStart(12, '0');
        const macAddr = macPad.match(/.{1,2}/g).join(':');

        const result = await ceilingFanControlRepository.getUnitCount(macAddr);
        console.log("getUnitCount = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

export async function getInitFanInfo(req, res) {
    try {
        console.log("getInitFanInfo 조회")
        const mac = req.params.macAddr;
        console.log("mac =", mac);

        // 12자리로 맞추기 위해 앞에 0을 추가 (필요한 경우)
        const macPad = mac.padStart(12, '0');
        const macAddr = macPad.match(/.{1,2}/g).join(':');

        const result = await ceilingFanControlRepository.getInitFanInfoInGateway(macAddr);
        console.log("getInitFanInfo = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
    
}


export async function getGatewayStatusById(req, res) {
    try {
        console.log("getGatewayStatusById 조회")
        const gwId = req.params.gwId;
        console.log("gwId =", gwId);
        const result = await ceilingFanControlRepository.getGatewayStatusById(gwId);
        console.log("getGatewayStatusById = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


export async function removeAllGateways(req, res) {
    try {
        console.log("removeAllGateways")
       
        const result = await ceilingFanControlRepository.removeAllGateways();
        console.log("removeAllGateways = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

export async function removeGateway(req, res) {
    try {
        console.log("removeGateway")
        const gwId =  req.params.gwId;
        
        const result = ceilingFanControlRepository.removeGateway(gwId);
        console.log("removeGateway = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


export async function resetGateway(req, res) {
    try {
        console.log("resetGateway")
        const gwId =  req.params.gwId;
        
        const result = await ceilingFanControlRepository.resetGateway(gwId);
        console.log("resetGateway = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


//전체 게이트웨어 얻기
export async function getGatewayList(req, res) {
    try {
        console.log("getGatewayList")
        
        const result = await ceilingFanControlRepository.getGatewayList();
        console.log("getGatewayList = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


// 팬 작동/정지
export async function fanOnOff(req, res) {
    try {
        console.log("리얼 팬 온오프");
        console.log(req.body);
        const info = req.body;
        const result = await ceilingFanControlRepository.fanOnOff(info);

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

//팬이름 지정
export async function setFanName(req, res) {
    try {
        console.log("팬 이름");
        console.log(req.body);
        const info = req.body;
        const result = await ceilingFanControlRepository.setFanName(info);

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


// 팬 작동/정지
export async function fanAllOnOff(req, res) {
    try {
        console.log("전체팬 온오프");
        console.log(req.body);
        const info = req.body;
        const result = await ceilingFanControlRepository.fanAllOnOff(info);

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}



// 팬 회전제어
export async function rotateState(req, res) {
    try {
        console.log("팬 회전 온오프");
        const info = req.body;
        console.log(req.body);
        const result = await ceilingFanControlRepository.fanRotate(info);

        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

// 팬 풍속변경
export async function speedControl(req, res) {
    try {
        console.log("팬 속도 변경");
        const info = req.body;
        console.log(req.body);
        const result = await ceilingFanControlRepository.speedControl(info);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


// gateway confirm 하기
export async function setConfirmGateway(req, res) {
    try {
        console.log("게이트웨이 confirm 하기");
        const info = req.body;
        console.log(req.body);
        const result = await ceilingFanControlRepository.setConfirmGateway(info);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}

//전체 게이트웨어중에 confirmed = false 인 게이트웨이 얻기
export async function getNotConfirmedGateways(req, res) {
    try {
        console.log("getNotConfirmedGateways")
        
        const result = await ceilingFanControlRepository.getNotConfirmedGateways();
        console.log("getNotConfirmedGateways = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}


export async function getConfirmedGateways(req, res) {
    try {
        console.log("getConfirmedGateways")
        
        const result = await ceilingFanControlRepository.getConfirmedGateways();
        console.log("getConfirmedGateways = ", result);
        res.json(result);
    } catch (error) {
        console.log(error);
    }
}