import "reflect-metadata";
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import dotenv from "dotenv";
import schedule from 'node-schedule';
dotenv.config();
// console-stamp
import consoleStamp from 'console-stamp'; // console.log 시간 정보 추가
consoleStamp(console, ['yyyy/mm/dd HH:MM:ss.l']);

// DB typeORM
import { AppDataSource } from './models/data-source.js';
import { AppDataSource_1 } from './models/movingFan/data-source_1.js';
//import { AppDataSource as AppDataSource_1} from '/home/siyoo/FanZic-App/db/data-source.js';
// utils
import { createFanSchedule } from "./repositories/fanControl.repository.js";
import { createGroupSchedule } from "./repositories/group.repository.js";
import { uploadSchedule } from "./utils/uploadSchedule.js";
import cron from 'node-cron';

// Router
import houseRoutes from './routes/house.routes.js';
import gateRoutes from './routes/gate.routes.js';
import groupRoutes from './routes/group.routes.js';
import realFanControlRoutes from './routes/realFanControlRouter.js';
import fanControlRoutes from './routes/fanControl.routes.js';
import fanRoutes from './routes/fan.routes.js';
import mainControlRoutes from './routes/mainControl.routes.js';

const app = express();
const PORT = process.env.SERVER_PORT;

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

await AppDataSource_1.initialize()
  .then(async () => {
    console.log("Data Source_1 has been initialized!");
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
});



await AppDataSource.initialize()
  .then(async () => {
    console.log("Data Source has been initialized!");
    uploadSchedule();
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
});


// const schedules = await reservationScheduleRepository.find();
// console.log(schedules);



// Router
//app.use('/api/ceilingFanControl', fanControlRoutes);
app.use('/api/real', realFanControlRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/fan', fanRoutes);
app.use('/api/house', houseRoutes);
// app.use('/api/fanControl', fanControlRoutes);
app.use('/api/fanControl', fanControlRoutes);
app.use('/api/ceilingFanControl', realFanControlRoutes);
app.use('/api/mainControl', mainControlRoutes);


// function scheduleDeleteFanStatus() {
//   // 매시간 정각에 실행
//   schedule.scheduleJob('*/2 * * * *', async () => {
//       console.log('Deleting fan statuses at the top of the hour...');
//       const result = await deleteFanStatus();
//       console.log(`Delete operation result: ${result}`);
//   });
// }

//20241226 추가 
// fanStatusManager 시작
// startFanStatusMonitoring();

//20250103 추가
// scheduleDeleteFanStatus();

// async function uploadSchedule () {
//   const schedules = await reservationScheduleRepository.find();

//   console.log(schedules);

  
// }



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});