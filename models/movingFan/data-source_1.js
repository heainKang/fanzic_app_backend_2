// src/data-source.js
import { DataSource } from "typeorm";
import { User } from "./user.js";
import { PushMessage } from "./push_message.js";
import { UserTokenMapping } from "./user_token_mapping.js";

import fs from 'fs';
import path from 'path';

const ormconfigPath= path.resolve('./fanzicApp_ormconfig.json');
//const ormconfigPath = path.resolve('ormconfig_out.json');
const ormconfig = JSON.parse(fs.readFileSync(ormconfigPath, 'utf8'));

export const AppDataSource_1 = new DataSource({
  ...ormconfig,
  entities: [User, PushMessage, UserTokenMapping]
});