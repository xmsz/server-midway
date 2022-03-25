import { Filter } from 'mongodb';
import { ISearchReq } from '../interface';

const transformSort = (sort?: string) => {
  if (!sort) return {};
  const [fieldPath, directionStr] = sort.split(':');
  if (!fieldPath || !directionStr) return {};
  return {
    orderBy: { [fieldPath]: directionStr.toLowerCase() as 'desc' | 'asc' },
  };
};

const transformFilters = (filters?: Filter<{ [prop: string]: any }>) => {
  if (!filters?.$and?.length) return {};

  const handler = (obj: Filter<{ [prop: string]: any }>) => {
    const object = { ...obj };
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        if (key === '$not') {
          object[key] = new RegExp(String(obj[key]));
        }
        if (
          typeof object[key] === 'object' &&
          Object.keys(object[key]).length
        ) {
          object[key] = handler(object[key]);
        }
      }
    }
    return object;
  };
  return {
    where: {
      $and: filters.$and.map(handler),
    },
  };
};
export function transformSearchReqToQuery({
  page,
  pageSize,
  sort,
  filters,
}: ISearchReq) {
  return {
    take: pageSize ? pageSize : undefined,
    skip: page && pageSize ? page * pageSize : undefined,
    ...transformSort(sort),
    ...transformFilters(filters),
  };
}
