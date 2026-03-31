import "reflect-metadata";
import { AppDataSource } from '../models/data-source.js';
import { Gate } from "../models/gate.js";
import { Fan } from "../models/fan.js";
import { House } from "../models/house.js";
import { Group } from "../models/group.js";
import { fanGroupMapping } from "../models/fan_group_mapping.js";
import { ModelType } from "../models/model_type.js";

import { In } from 'typeorm';
import { Gateway, GatewayManager } from '../realGatewayManager.js';
import { getRpm } from '../repositories/fanControl.repository.js';

const gateRepository = AppDataSource.getRepository(Gate);
const fanRepository = AppDataSource.getRepository(Fan);
const houseRepository = AppDataSource.getRepository(House);
const fanGroupMappingRepository = AppDataSource.getRepository(fanGroupMapping);
const groupRepository = AppDataSource.getRepository(Group);
const modelTypeRepository = AppDataSource.getRepository(ModelType);
