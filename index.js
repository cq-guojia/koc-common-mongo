const Mongoose = require('mongoose');

const KOCReturn = require('koc-common-return');

let clientList = {};

const KOCMongo = {
  // region Init:初始化
  Init: (dblist) => {
    if (!dblist) {
      return;
    }
    if (!(dblist instanceof Array)) {
      dblist = [dblist];
    }
    dblist.forEach((ThisValue) => {
      try {
        const Options = {
          useMongoClient: true,
          config: {
            autoIndex: false,
          },
        };
        let Auth = '';
        if (ThisValue.user && ThisValue.password) {
          Auth = ThisValue.user + ':' + ThisValue.password + '@';
        }
        let ConnectString = 'mongodb://' + Auth + ThisValue.uri + ':' + ThisValue.port + '/' + ThisValue.database;
        // Use native promises
        Mongoose.Promise = global.Promise;
        clientList[ThisValue.name] = Mongoose.createConnection(ConnectString, Options);
      } catch (ex) {
      }
    });
    return clientList;
  },
  // endregion
  // region Model:取得Model
  Model: (db, name, obj) => {
    return db.model(name, new Mongoose.Schema(obj), name);
  },
  // endregion
  // region PageParm:分页，参数
  PageParm: function() {
    this.GetPageInfo = true;
    this.OrderName = '';
    this.Start = 1;
    this.Length = 0;
  },
  // endregion
  // region PageInfo:分页，页数据1
  PageInfo: async (model, criteria) => {
    let RecordCount = 0;
    let retValue = await KOCReturn.Promise(() => {
      return model.count(criteria);
    });
    if (!retValue.hasError) {
      RecordCount = retValue.returnObject;
    }
    if (!RecordCount) {
      return {
        RecordCount: 0,
        MaxCode: '',
      };
    }
    retValue = await KOCReturn.Promise(() => {
      return model.findOne(criteria);
    });
    if (retValue.hasError) {
      return {
        RecordCount: 0,
        MaxCode: '',
      };
    }
    return {
      RecordCount: RecordCount,
      MaxCode: retValue.returnObject._id,
    };
    return retValue;
  },
  // endregion
  // region PageList:分页数据
  PageList: async (model, criteria, pageparm) => {
    return await KOCReturn.Promise(() => {
      let Sort = null;
      if (pageparm.OrderName) {
        Sort = {};
        pageparm.OrderName = pageparm.OrderName.split(',');
        for (let ThisValue of pageparm.OrderName) {
          ThisValue = ThisValue.split(' ');
          ThisValue.length === 2 &&
          (Sort[ThisValue[0]] = ThisValue[1].toLowerCase());
        }
      }
      let Query = model.find(criteria);
      Sort && (Query.sort(Sort));
      pageparm.Start && (Query.skip(pageparm.Start));
      return Query.limit(pageparm.Length);
    });
  },
  // endregion
  // region Page:分页
  Page: async (model, criteria, max, pageparm) => {
    !criteria && (criteria = {});
    max && (criteria._id = {$gte: max});
    let retValue = await KOCMongo.PageList(model, criteria, pageparm);
    if (!pageparm.GetPageInfo || retValue.hasError) {
      return retValue;
    }
    retValue.PutValue('PageInfo', await KOCMongo.PageInfo(model, criteria));
    return retValue;
  },
  // endregion
};

module.exports = KOCMongo;