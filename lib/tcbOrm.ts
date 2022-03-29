import { Init, Inject } from '@midwayjs/decorator';
import { CloudbaseService } from 'midway-cloudbase';
import tcbOrmRaw, { IRecordType } from 'tcb-orm';
import { Database } from '@cloudbase/node-sdk/types';

export default class TcbOrm<
  IRecord extends IRecordType
> extends tcbOrmRaw<IRecord> {
  @Inject()
  tcbService: CloudbaseService;

  tableName: string;
  db: Database.Db;
  coll: Database.CollectionReference;

  @Init()
  async init() {
    this.db = this.tcbService.database();
    this.coll = this.db.collection(this.tableName);
  }
}
