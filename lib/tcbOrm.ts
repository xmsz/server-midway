import { Init, Inject } from '@midwayjs/decorator';
import { CloudbaseService } from 'midway-cloudbase';
import { Filter, UpdateFilter } from 'mongodb';
import { Database, Database as TcbDatabase } from '@cloudbase/node-sdk/types';

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface IRecordBase {
  _id: string;
  createTime: number;
  updateTime: number;
}

export interface IRecordType extends IRecordBase {
  [prop: string]: any;
}

export default class TcbOrm<IRecord extends IRecordType> {
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

  async createMany(
    data: Array<
      Omit<WithOptional<IRecord, 'updateTime' | 'createTime' | '_id'>, '_id'>
    >
  ) {
    const res = await this.coll.add(
      data.map(item => ({
        updateTime: +new Date(),
        createTime: +new Date(),
        ...item,
      }))
    );

    return res;
  }

  async create(
    data: Omit<
      WithOptional<IRecord, 'updateTime' | 'createTime' | '_id'>,
      '_id'
    >
  ) {
    const res = await this.coll.add({
      updateTime: +new Date(),
      createTime: +new Date(),
      ...data,
    });

    return res;
  }

  async update({
    where,
    data,
  }: {
    where: Filter<IRecord>;
    data: UpdateFilter<IRecord>;
  }) {
    const res = await this.coll
      .where(where)
      .limit(1)
      .updateAndReturn({ updateTime: +new Date(), ...data });

    return res.doc as IRecord;
  }

  async upsert({
    where,
    update,
    create,
  }: {
    where: Filter<IRecord>;
    update: UpdateFilter<IRecord>;
    create: Omit<
      WithOptional<IRecord, 'updateTime' | 'createTime' | '_id'>,
      '_id'
    >;
  }) {
    const record = await this.findUnique({ where });
    if (record) {
      return this.update({ where, data: update });
    } else {
      return this.create(create);
    }
  }

  async updateMany({
    where,
    data,
  }: {
    where: Filter<IRecord>;
    data: UpdateFilter<IRecord>;
  }) {
    await this.coll.where(where).update({ updateTime: +new Date(), ...data });
  }

  async updateById(id: string, data: UpdateFilter<IRecord>) {
    return this.update({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore type
      where: {
        _id: { $eq: id },
      },
      data,
    });
  }

  async query(args: {
    where?: Filter<IRecord>;
    skip?: number;
    take?: number;
    orderBy?: Partial<Record<keyof IRecord, Database.OrderByDirection>>;
  }) {
    const newArgs = {
      ...args,
      skip: args.skip ?? 0,
      take: args.take ?? 10,
    };

    const [data, { total }] = await Promise.all([
      this.findMany(newArgs),
      this.count(newArgs),
    ]);

    return {
      list: data,
      total,
      pageSize: newArgs.take,
      page: newArgs.skip * newArgs.take,
    };
  }

  async findMany({
    where,
    skip = 0,
    take = 10,
    orderBy,
    select,
  }: {
    where?: Filter<IRecord>;
    skip?: number;
    take?: number;
    orderBy?: Partial<Record<keyof IRecord, Database.OrderByDirection>>;
    select?: Partial<Record<keyof IRecord, boolean>>;
  }) {
    let query = this.coll.where(where || {});

    if (orderBy) {
      const orderByKeys = Object.entries(orderBy);
      if (orderByKeys.length) {
        const [key, direction] = orderByKeys[0];
        query = query.orderBy(key, direction);
      }
    }

    if (select) {
      query = query.field(select);
    }

    const { data } = await query.skip(skip).limit(take).get();

    return data as IRecord[];
  }

  async delete({ where }: { where?: Filter<IRecord> }) {
    const record = await this.findUnique({ where });
    const res = await this.coll.doc(record._id).remove();
    return res;
  }

  async deleteMany({ where }: { where?: Filter<IRecord> }) {
    const res = await this.coll.where(where).remove();
    return res;
  }

  async findUnique({
    where,
    orderBy,
  }: {
    where?: Filter<IRecord>;
    orderBy?: Partial<Record<keyof IRecord, Database.OrderByDirection>>;
  }) {
    const res = await this.findMany({
      where: where,
      take: 1,
      orderBy,
    });

    return res[0] ? res[0] : null;
  }

  async findById(id: string) {
    const res = await this.findUnique({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore type
      where: {
        _id: { $eq: id },
      },
    });
    return res ? res : null;
  }

  async count({ where }: { where?: Filter<IRecord> }) {
    const query = this.coll.where(where || {});
    const { total } = await query.count();

    return {
      total,
    };
  }

  aggregate() {
    const aggregate = this.coll.aggregate() as TcbDatabase.Aggregation;

    return aggregate;
  }
}