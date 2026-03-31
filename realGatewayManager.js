//실링팬용 게이트웨이 추가시 호출되는 클래스 
import express from 'express';
import dotenv from "dotenv";
import { dirxml } from 'console';
dotenv.config();


const app = express();
app.use(express.json());


class CeilingFan {
    constructor(id, name){
        this.id = id;
        this.name = name;

        this.rpm = "";
        this.dir = "";
        this.status= "";
    }

    printInfo() {
        console.log(`id: ${this.id}, name: ${this.name}, rpm=${this.rpm}, dir=${this.dir},status=${this.status}`);
    }

    setName(fanName){
        this.name = fanName;
    }

    setStatus(rpm, dir, status){
        this.rpm = rpm;
        this.dir = dir;
        this.status = status;
    }

}



class Gateway {
    constructor(id, name, macAddress, fanIdList= []){
        this.id = id;
        this.name = name;
        this.macAddress = macAddress;
        this.fanList = [];
        this.confirmed = false;

        for( var fanId of fanIdList){
            const newFan = new CeilingFan(fanId, fanId);
            this.fanList.push(newFan);
        }

    }

    addFan(fanId, fanName){
        const existingFan = this.fanList.find(fan => fan.id === fanId);
        if(existingFan){
            console.log(`Fan with fanId = ${fanId} already exists.`);
            return null
        }

        const newFan = new CeilingFan(fanId, fanName);
        this.fanList.push(newFan);
        console.log(`Fan added: ${JSON.stringify(newFan)}`);
        return newFan
    }

    getFan(fanId){
        const existingFan = this.fanList.find(fan => fan.id === fanId);
        if(existingFan === null){
            console.log(`Fan with fanId = ${fanId} not exist.`);
            return null
        }

        return existingFan;

    }

    setGatewayName(gateName){
        this.name = gateName;
    }


    getAllFans(){
        return this.fanList;
    }

    setFanName(fanId, fanName){
        const existingFan = this.fanList.find(fan => fan.id === fanId);
        if(!existingFan){
            console.log(`Fan with fanId = ${fanId} not exists.`);
            return null
        }
        existingFan.name = fanName
    }

    setFanStatus(fanId, rpm, dir, status){
        const existingFan = this.fanList.find(fan => fan.id === fanId);
        if(!existingFan){
            console.log(`Fan with fanId = ${fanId} not exists.`);
            return null
        }
        existingFan.setStatus(rpm, dir, status);
    }


    setAllFanStatus(rpm, dir, status){

        for(var fan of this.fanList){

            fan.setStatus(rpm, dir, status);
        }
    }

    removeAllFans(){
        this.fanList = []
    }

    setConfirm(bConfirm){
        this.confirmed = bConfirm;
    }

    printInfo() {
        console.log(`id: ${this.id}, macAddress: ${this.macAddress},  fanList: ${this.fanList}`);
    }

}


class GatewayManager{
    constructor(){
        this.gatewayList = [];
        this.nextId = 1;

        var fanIdList = ["03", "02"];
        var fanNameList = ["FANZIC_CF1", "FANZIC_CF2"];
        var newGateway = this.addGateway("1C:69:20:CE:F4:F8", fanIdList);
        //var newGateway = this.addGateway("1C:69:20:CE:F5:A8", fanIdList);
        var gatewayName = "Gate_1";
        if(newGateway){
            newGateway.setGatewayName(gatewayName);
            var msgRes = newGateway.setConfirm(true)
            newGateway.fanList[0].setName(fanNameList[0]);
            newGateway.fanList[1].setName(fanNameList[1]);
            
            console.log("게이트 생성:", newGateway)
        }else {
            console.log("게이트 생성 실패");
        }
    }

    //Gateway추가 
    addGateway(macAddress, fanIdList=[]){
        //이미 존재하는지 확인
        const existingGateway = this.gatewayList.find(gateway => gateway.macAddress === macAddress);
        if (existingGateway) {
            console.log(`Gateway with MAC Address ${macAddress} already exists. Addition aborted.`);
            return null; // 추가 실패
        }

        //새로운 gateway 추가 
        const newGateway = new Gateway(this.nextId, this.nextId, macAddress, fanIdList);
        this.gatewayList.push(newGateway);
        this.nextId++;
        console.log(`Gateway added: ${JSON.stringify(newGateway)}`);
        return newGateway
    }


    //전체 gateway 얻기
    getAllGateways(){
        return this.gatewayList;
    }

    getConfirmedGateways(){
        const confirmedGatewayList = this.gatewayList.filter(gateway => gateway.confirmed === true)
        return confirmedGatewayList
    }

    getNotConfirmedGateways(){
        const notConfirmedGatewayList = this.gatewayList.filter(gateway => gateway.confirmed === false)
        return notConfirmedGatewayList
    }
    
    //gateway_id인 gateway 얻기
    getGatewayInfoById(gateway_id){
        const existingGateway = this.gatewayList.find(gateway => gateway.id === Number(gateway_id));
        if(!existingGateway){
            console.log("gatewayId=",gateway_id, "gateway 가 존재하지 않습니다.");
            return null;
        }

        console.log("existingGateway = ", existingGateway);

        return existingGateway;

    }

    //macAddress인  gateway 얻기
    getGatewayByMacAddress(macAddress){
        const existingGateway = this.gatewayList.find(gateway => gateway.macAddress === macAddress);
        if(!existingGateway){
            console.log("macAddress=",macAddress, "gateway 가 존재하지 않습니다.");
            return null;
        }

        return existingGateway;

    }

    //gwId인 Gateway삭제
    removeGatewayById(gwId){
        const initialLength = this.gatewayList.length;
        this.gatewayList = this.gatewayList.filter(gateyway => gateway.id !== Number(gwId))

        if (this.gatewayList.length < initialLength) {
            console.log(`Gateway with gwId ${gwId} removed.`);
            return true; // 삭제 성공
        } else {
            console.log(`No Gateway found with gwId ${gwId}.`);
            return false; // 삭제 실패
        }
    }

    removeAllGateways(){
        if(this.gatewayList.length === 0){
            console.log("No devices to remove.");
            return false
        }

        this.gatewayList = [];
        this.nextId = 1;
        console.log("all gateways have been removed.");
        return true;
    }

}

export {Gateway, GatewayManager};