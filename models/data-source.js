import { DataSource } from "typeorm";
import { Gate } from "./gate.js";
import { House} from "./house.js";
import { Group } from "./group.js";
import { Notice } from "./notice.js";
import { fanGroupMapping } from "./fan_group_mapping.js";
import { fanControlLog } from "./fan_control_log.js";
import { Fan } from "./fan.js";
import { ModelType } from "./model_type.js";
import { reservationSchedule } from "./reservation_schedule.js";
import { PushMessage } from "./push_message.js";

import fs from 'fs';
import path from 'path';

const ormconfigPath = path.resolve('./ormconfig.json');

const ormconfig = JSON.parse(fs.readFileSync(ormconfigPath, 'utf8'));

export const AppDataSource = new DataSource({
    ...ormconfig,
  entities: [Gate, House, Fan, Group, Notice, fanControlLog, fanGroupMapping, ModelType, reservationSchedule, PushMessage]
})